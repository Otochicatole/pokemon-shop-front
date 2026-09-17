'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useMutation, useQuery as useReactQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowLeft, Check, CircleDollarSign, Clock3, Eye, Info, Landmark, MapPin, Package, Percent, RefreshCw, Search, Settings2, ShieldAlert, Timer, Truck, WalletCards, X } from 'lucide-react';
import { toast } from '@/components/feedback';
import { AdminPageHeader, Button, Dialog, SelectField, TextareaField, TextField } from '@/components';
import { adminErrorMessage, adminFetch } from '@/shared/admin/client';
import { AffiliateAdminNavigation, type AffiliateAdminSection } from './affiliate-admin-navigation';
import styles from './admin-affiliate-operations.module.css';

import shared from '@/components/admin/admin-shared.module.css';
type Section = AffiliateAdminSection;
type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };
type Seller = { id: string; publicName: string; status: 'ACTIVE' | 'SUSPENDED'; version: number; commissionBpsOverride?: number | null; user?: { id: string; email: string; name: string | null }; counts?: { listings: number; sellerOrders: number; issues?: number; payoutRequests?: number } };
type Listing = {
  id: string;
  status: string;
  reviewNote: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  product: {
    id: string;
    name: string;
    description: string;
    kind?: string;
    priceMinor: string;
    version: number;
    status: string;
    images: Array<{ id: string; url: string; altText: string | null; sortOrder?: number }>;
    inventory?: { available: number } | null;
  };
  affiliate: { id: string; publicName: string; status?: string };
};
type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

type SellerOrder = {
  id: string;
  number: string;
  sellerName: string;
  sellerType?: 'STORE' | 'AFFILIATE';
  affiliate?: { id: string; publicName: string } | null;
  affiliateId?: string | null;
  status: string;
  version: number;
  fulfillmentType?: 'SHIPMENT' | 'PICKUP';
  subtotalMinor: string;
  shippingMinor: string;
  commissionMinor?: string;
  sellerNetMinor: string;
  allowedActions?: string[];
  carrier?: string | null;
  trackingCode?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  pickupPointName?: string | null;
  pickupPointAddress?: string | null;
  shippingZoneName?: string | null;
  shippingRateName?: string | null;
  sellerContactPhone?: string | null;
  statusHistory?: Array<{ id: string; fromStatus: string | null; toStatus: string; note?: string | null; createdAt: string }>;
  parentOrder?: { id: string; number: string; status: string; paymentStatus: string | null };
  order?: { number: string; userId?: string; paymentId?: string | null };
  items?: Array<{ id?: string; productName?: string; name?: string; quantity: number; lineTotalMinor: string }>;
};
type RefundInput = { amountMinor: string; reason: string; externalReference: string; restock: boolean };
type Issue = { id: string; status: string; reason: string; resolutionNote?: string | null; createdAt: string; version?: number; affiliate: { id: string; publicName: string }; sellerOrder: SellerOrder };
type Cancellation = { id: string; status: string; reason: string; resolutionNote?: string | null; version: number; createdAt: string; affiliate: { id: string; publicName: string }; sellerOrder: SellerOrder; orderNumber?: string };
type Payout = { id: string; amountMinor: string; status: 'REQUESTED' | 'PROCESSING' | 'PAID' | 'REJECTED'; version: number; destinationLast4?: string | null; externalReference?: string | null; createdAt: string; affiliate: { id: string; publicName: string } };
type PayoutDetail = { payout: Payout; availableMinor: string; ledger: Array<{ id: string; bucket: string; type: string; amountMinor: string; createdAt: string }> };
type Summary = { affiliates: number; listings: Array<{ status: string; _count: { _all: number } }>; orders: Array<{ status: string; _count: { _all: number }; _sum: { sellerNetMinor: string | null } }>; queues: { issues: number; cancellations: number; payouts: number }; obligationsMinor: string };
type QueryState<T> = { data: T; isLoading: boolean; isError: boolean; error: Error | null };

function useQuery<TData>(options: { queryKey: readonly unknown[]; queryFn: () => Promise<TData>; enabled?: boolean }): Omit<UseQueryResult<TData, Error>, 'data'> & { data: TData } {
  const result = useReactQuery<TData, Error>(options);
  return { ...result, data: result.data as TData };
}

function payload<T>(value: T | { data: T }): T { return value && typeof value === 'object' && 'data' in value ? (value as { data: T }).data : value as T; }
function money(value: string | null | undefined) { if (!value) return '—'; return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(Number(BigInt(value)) / 100); }
function label(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase()); }
function date(value: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function listingKindLabel(kind?: string) {
  return ({ SINGLE_CARD: 'Carta suelta', SEALED_PRODUCT: 'Producto sellado', ACCESSORY: 'Accesorio' } as Record<string, string>)[kind ?? ''] ?? (kind ? label(kind) : 'Sin tipo');
}
function listingStatusClass(status: string) {
  const map: Record<string, string> = {
    DRAFT: styles.isDraft,
    PENDING_REVIEW: styles.isPendingReview,
    CHANGES_REQUESTED: styles.isChangesRequested,
    REJECTED: styles.isRejected,
    APPROVED: styles.isApproved,
  };
  return [styles.adminListingStatus, map[status] ?? ''].filter(Boolean).join(' ');
}
function queryPage<T>(path: string) { return adminFetch<Page<T> | T[]>(path).then((result) => { const value = payload(result); return Array.isArray(value) ? { items: value, page: 1, pageSize: value.length, total: value.length, totalPages: 1 } : value; }); }
function payoutStatusClass(status: string) {
  const map: Record<string, string> = {
    REQUESTED: styles.isRequested,
    PROCESSING: styles.isProcessing,
    PAID: styles.isPaid,
    REJECTED: styles.isRejected,
  };
  return [styles.adminPayoutStatus, map[status] ?? ''].filter(Boolean).join(' ');
}
function orderStatusClass(status: string) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: styles.isPendingPayment,
    PAID: styles.isPaid,
    PREPARING: styles.isPreparing,
    READY_FOR_PICKUP: styles.isReady,
    PICKED_UP: styles.isReady,
    SHIPPED: styles.isShipped,
    COMPLETED: styles.isCompleted,
    CANCELLATION_REQUESTED: styles.isWarning,
    DISPUTED: styles.isWarning,
    CANCELLED: styles.isCancelled,
    REFUNDED: styles.isCancelled,
  };
  return [styles.adminOrderStatus, map[status] ?? ''].filter(Boolean).join(' ');
}
function ledgerBucket(value: string) { return ({ AVAILABLE: 'Disponible', RESERVED: 'Reservado', PENDING: 'Pendiente', PAID: 'Pagado' } as Record<string, string>)[value] ?? label(value); }
function ledgerType(value: string) { return ({ PAYOUT_RESERVED: 'Reserva del retiro', PAYOUT_PAID: 'Retiro pagado', PAYOUT_RELEASED: 'Reserva liberada', SALE_RELEASED: 'Venta liberada' } as Record<string, string>)[value] ?? label(value); }

function Shell({ active, title, description, action, children }: { active: Section; title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <AdminPageHeader eyebrow="Marketplace" title={title} description={description} actions={action} />
      <div className={styles.affiliateAdminLayout}>
        <AffiliateAdminNavigation active={active} />
        <div className={styles.affiliateAdminContent}>{children}</div>
      </div>
    </>
  );
}
function Feedback({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <div className={`${styles.adminFeedback} ${error ? styles.isError : ''}`} role={error ? 'alert' : undefined}>{children}</div>;
}

export function AdminAffiliateOperations({ section, id }: { section: Section; id?: string }) {
  if (section === 'overview') return <Overview />;
  if (section === 'sellers') return <Sellers id={id} />;
  if (section === 'listings') return <Listings id={id} />;
  if (section === 'orders') return <Orders id={id} />;
  if (section === 'issues') return <Queue section="issues" id={id} />;
  if (section === 'cancellations') return <Queue section="cancellations" id={id} />;
  if (section === 'payouts') return <Payouts id={id} />;
  return <Settings />;
}

function Overview() {
  const query = useQuery({ queryKey: ['admin', 'affiliate-summary'], queryFn: () => adminFetch<Summary>('/admin/affiliates/summary').then(payload) });
  return (
    <Shell
      active="overview"
      title="Resumen de afiliados"
      description="Supervisá la operación comercial, las obligaciones de saldo y las colas que requieren atención."
      action={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>}
    >
      {query.isLoading ? <Feedback>Cargando resumen…</Feedback> : query.isError ? <Feedback error>{adminErrorMessage(query.error)}</Feedback> : query.data && (
        <div className={styles.adminAffiliateDashboard}>
          <div className={styles.adminMetricGrid}>
            <article className={styles.adminMetricCard}><span>Afiliados</span><strong>{query.data.affiliates}</strong><small>Activos y suspendidos</small></article>
            <article className={styles.adminMetricCard}><span>Incidencias abiertas</span><strong>{query.data.queues.issues}</strong><small>Requieren resolución</small></article>
            <article className={styles.adminMetricCard}><span>Cancelaciones</span><strong>{query.data.queues.cancellations}</strong><small>Esperando decisión</small></article>
            <article className={styles.adminMetricCard}><span>Obligaciones</span><strong>{money(query.data.obligationsMinor)}</strong><small>Pendiente, disponible y reservado</small></article>
          </div>
          <section className={shared.adminPanel}>
            <div className={shared.adminPanelHeader}>
              <div>
                <span className={shared.adminPanelKicker}>Colas operativas</span>
                <h2>Atención prioritaria</h2>
              </div>
            </div>
            <div className={[shared.adminPanelBody, styles.adminAffiliateQueueLinks].filter(Boolean).join(' ')}>
              <Link href="/admin/affiliates/issues"><ShieldAlert size={18} /><span><strong>{query.data.queues.issues} incidencias abiertas</strong><small>Resolver, continuar o reembolsar</small></span></Link>
              <Link href="/admin/affiliates/cancellations"><X size={18} /><span><strong>{query.data.queues.cancellations} cancelaciones solicitadas</strong><small>Aprobar o rechazar con motivo</small></span></Link>
              <Link href="/admin/affiliates/payouts"><WalletCards size={18} /><span><strong>{query.data.queues.payouts} retiros por procesar</strong><small>Flujo solicitado, procesando y pagado</small></span></Link>
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}

function Sellers({ id }: { id?: string }) {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const query = useQuery({ queryKey: ['admin', 'affiliate-sellers', submitted], queryFn: () => queryPage<Seller>(`/admin/affiliates?pageSize=50${submitted ? `&search=${encodeURIComponent(submitted)}` : ''}`) });
  const detail = useQuery({ queryKey: ['admin', 'affiliate-seller', id], queryFn: () => adminFetch<{ affiliate: Seller; balance: Record<string, string>; listings: Listing[]; orders: SellerOrder[]; payouts: Payout[] }>(`/admin/affiliates/${id}`).then(payload), enabled: Boolean(id) });
  const update = useMutation({ mutationFn: (row: Seller) => adminFetch(`/admin/affiliates/${row.id}`, { method: 'PATCH', body: JSON.stringify({ expectedVersion: row.version, status: row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }) }), onSuccess: () => { toast.success('Estado actualizado'); void client.invalidateQueries({ queryKey: ['admin', 'affiliate-sellers'] }); }, onError: (error) => toast.error(adminErrorMessage(error)) });
  if (id) return <SellerDetail query={detail} />;
  return (
    <Shell
      active="sellers"
      title="Afiliados"
      description="Listado filtrable de vendedores, estado, publicaciones, ventas y saldo."
      action={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>}
    >
      <form className={[shared.adminToolbar, styles.affiliateAdminToolbar].filter(Boolean).join(' ')} onSubmit={(event) => { event.preventDefault(); setSubmitted(search.trim()); }}>
        <TextField label="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o email" />
        <Button type="submit" variant="secondary"><Search size={16} />Buscar</Button>
      </form>
      <section className={shared.adminPanel}>
        <div className={shared.adminPanelHeader}>
          <div>
            <span className={shared.adminPanelKicker}>Directorio</span>
            <h2>Vendedores habilitados</h2>
          </div>
          {!query.isLoading && !query.isError ? <span className={shared.adminCountBadge}>{query.data.items.length}</span> : null}
        </div>
        {query.isLoading ? <Feedback>Cargando afiliados…</Feedback> : query.isError ? <Feedback error>{adminErrorMessage(query.error)}</Feedback> : (
          <div className={shared.adminPanelBody}>
            <ul className={shared.adminList}>
              {query.data.items.map((row) => (
                <li key={row.id}>
                  <div className={shared.adminListRow}>
                    <Link href={`/admin/affiliates/sellers/${row.id}`}>
                      <strong>{row.publicName}</strong>
                      <span>{row.user?.name ? `${row.user.name} · ` : ''}{row.user?.email}</span>
                      <small>{row.counts?.listings ?? 0} publicaciones · {row.counts?.sellerOrders ?? 0} ventas</small>
                    </Link>
                    <div className={shared.adminRowActions}>
                      <span className={`${shared.adminBadge} ${row.status === 'ACTIVE'? shared.adminBadgeGreen : shared.adminBadgeRed}`}>{row.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}</span>
                      <Button variant="ghost" onClick={() => update.mutate(row)} disabled={update.isPending}>{row.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {query.data.items.length === 0 && <p className={shared.adminEmptyCopy}>No encontramos afiliados.</p>}
          </div>
        )}
      </section>
    </Shell>
  );
}

function SellerDetail({ query }: { query: QueryState<{ affiliate: Seller; balance: Record<string, string>; listings: Listing[]; orders: SellerOrder[]; payouts: Payout[] }> }) {
  const client = useQueryClient();
  const [commissionDraft, setCommissionDraft] = useState<string | undefined>(undefined);
  const saveCommission = useMutation({
    mutationFn: ({ affiliate, value }: { affiliate: Seller; value: number | null }) =>
      adminFetch(`/admin/affiliates/${affiliate.id}`, { method: 'PATCH', body: JSON.stringify({ expectedVersion: affiliate.version, commissionBpsOverride: value }) }),
    onSuccess: () => {
      toast.success('Excepción de comisión guardada');
      setCommissionDraft(undefined);
      void client.invalidateQueries({ queryKey: ['admin', 'affiliate-seller'] });
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  if (query.isLoading) return <Shell active="sellers" title="Ficha del afiliado" description="Cargando información del vendedor."><Feedback>Cargando…</Feedback></Shell>;
  if (query.isError || !query.data) return <Shell active="sellers" title="Afiliado no encontrado" description="La ficha no está disponible."><Feedback error>{query.error ? adminErrorMessage(query.error) : 'No encontrado'}</Feedback></Shell>;
  const { affiliate, balance, listings, orders, payouts } = query.data;
  const currentCommission = commissionDraft ?? (affiliate.commissionBpsOverride === null || affiliate.commissionBpsOverride === undefined ? '' : String(affiliate.commissionBpsOverride / 100));
  return (
    <Shell
      active="sellers"
      title={affiliate.publicName}
      description="Perfil, comisión, publicaciones, ventas, logística, saldo y retiros."
      action={<Link className="button button-secondary" href="/admin/affiliates/sellers"><ArrowLeft size={16} />Volver</Link>}
    >
      <div className={styles.adminMetricGrid}>
        <article className={styles.adminMetricCard}><span>Estado</span><strong>{affiliate.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}</strong><small>{affiliate.user?.email}</small></article>
        <article className={styles.adminMetricCard}><span>Comisión por defecto</span><strong>{affiliate.commissionBpsOverride === null || affiliate.commissionBpsOverride === undefined ? 'Global' : `${affiliate.commissionBpsOverride / 100}%`}</strong><small>Se congela en cada nueva suborden</small></article>
        <article className={styles.adminMetricCard}><span>Disponible</span><strong>{money(balance.AVAILABLE)}</strong><small>Saldo que puede retirar</small></article>
        <article className={styles.adminMetricCard}><span>Pendiente</span><strong>{money(balance.PENDING)}</strong><small>Ventas en período de cierre</small></article>
        <article className={styles.adminMetricCard}><span>Reservado</span><strong>{money(balance.RESERVED)}</strong><small>Retiros en proceso</small></article>
      </div>
      <section className={shared.adminPanel}>
        <div className={shared.adminPanelHeader}>
          <div>
            <span className={shared.adminPanelKicker}>Comercial</span>
            <h2>Excepción individual de comisión</h2>
          </div>
        </div>
        <div className={[shared.adminPanelBody, styles.affiliateAdminSectionStack].filter(Boolean).join(' ')}>
          <form
            className={styles.adminInlineFilter}
            onSubmit={(event) => {
              event.preventDefault();
              const value = currentCommission.trim() === '' ? null : Math.round(Number(currentCommission) * 100);
              if (value !== null && (!Number.isFinite(value) || value < 0 || value > 10000)) return toast.error('Ingresá una comisión entre 0 y 100%');
              saveCommission.mutate({ affiliate, value });
            }}
          >
            <TextField label="Comisión (%)" type="number" min="0" max="100" step="0.01" value={currentCommission} onChange={(event) => setCommissionDraft(event.target.value)} placeholder="Vacío = usar global" />
            <Button type="submit" disabled={saveCommission.isPending}>Guardar comisión</Button>
          </form>
          <p className="form-hint">Dejá vacío para volver a la comisión global. Las ventas históricas no se recalculan.</p>
        </div>
      </section>
      <div className={styles.adminTwoColumn}>
        <section className={shared.adminPanel}>
          <div className={shared.adminPanelHeader}>
            <div>
              <span className={shared.adminPanelKicker}>Catálogo</span>
              <h2>Publicaciones ({listings.length})</h2>
            </div>
          </div>
          <div className={[shared.adminPanelBody, styles.affiliateAdminSectionStack].filter(Boolean).join(' ')}>
            {listings.length ? listings.map((item) => (
              <Link className={styles.adminDetailLink} href={`/admin/affiliates/listings/${item.id}`} key={item.id}>
                <strong>{item.product.name}</strong>
                <span>{label(item.status)} · {money(item.product.priceMinor)}</span>
              </Link>
            )) : <p className={shared.adminEmptyCopy}>Sin publicaciones.</p>}
          </div>
        </section>
        <section className={shared.adminPanel}>
          <div className={shared.adminPanelHeader}>
            <div>
              <span className={shared.adminPanelKicker}>Operación</span>
              <h2>Ventas recientes ({orders.length})</h2>
            </div>
          </div>
          <div className={[shared.adminPanelBody, styles.affiliateAdminSectionStack].filter(Boolean).join(' ')}>
            {orders.length ? orders.map((item) => (
              <Link className={styles.adminDetailLink} href={`/admin/affiliates/orders/${item.id}`} key={item.id}>
                <strong>{item.number}</strong>
                <span>{label(item.status)} · {money(item.sellerNetMinor)}</span>
              </Link>
            )) : <p className={shared.adminEmptyCopy}>Sin ventas recientes.</p>}
          </div>
        </section>
      </div>
      <section className={shared.adminPanel}>
        <div className={shared.adminPanelHeader}>
          <div>
            <span className={shared.adminPanelKicker}>Finanzas</span>
            <h2>Historial de retiros</h2>
          </div>
        </div>
        <div className={shared.adminPanelBody}>
          {payouts.length ? payouts.map((item) => (
            <div className={styles.adminDetailLine} key={item.id}>
              <span>{date(item.createdAt)}</span>
              <strong>{money(item.amountMinor)}</strong>
              <em>{label(item.status)}</em>
            </div>
          )) : <p className={shared.adminEmptyCopy}>Todavía no hay retiros.</p>}
        </div>
      </section>
    </Shell>
  );
}

function Listings({ id }: { id?: string }) {
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<Listing | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'affiliate-listings-all', status],
    queryFn: () => queryPage<Listing>(`/admin/affiliates/listings?pageSize=50${status ? `&status=${status}` : ''}`),
  });
  const detail = useQuery({
    queryKey: ['admin', 'affiliate-listing', id],
    queryFn: () => adminFetch<{ listing: Listing }>(`/admin/affiliates/listings/${id}`).then(payload),
    enabled: Boolean(id),
  });
  const review = useMutation({
    mutationFn: ({ row, decision, note }: { row: Listing; decision: ReviewDecision; note?: string }) =>
      adminFetch(`/admin/affiliates/listings/${row.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          expectedVersion: row.product.version,
          decision,
          ...(decision === 'APPROVED' ? {} : { note: note?.trim() || 'Revisá la información y las imágenes de la publicación.' }),
        }),
      }),
    onSuccess: (result, variables) => {
      const response = result as { status?: string; productStatus?: string; version?: number; reviewNote?: string | null; reviewedAt?: string | null };
      client.setQueryData<Page<Listing>>(['admin', 'affiliate-listings-all', status], (current) => {
        if (!current) return current;
        if (status === 'PENDING_REVIEW') {
          return { ...current, items: current.items.filter((row) => row.id !== variables.row.id), total: Math.max(0, current.total - 1) };
        }
        return {
          ...current,
          items: current.items.map((row) =>
            row.id === variables.row.id
              ? {
                  ...row,
                  status: response.status ?? variables.decision,
                  reviewNote: response.reviewNote ?? (variables.decision === 'APPROVED' ? null : variables.note ?? row.reviewNote),
                  reviewedAt: response.reviewedAt ?? row.reviewedAt,
                  product: {
                    ...row.product,
                    status: response.productStatus ?? row.product.status,
                    version: response.version ?? row.product.version,
                  },
                }
              : row,
          ),
        };
      });
      client.setQueryData<{ listing: Listing }>(['admin', 'affiliate-listing', variables.row.id], (current) => {
        if (!current) return current;
        return {
          listing: {
            ...current.listing,
            status: response.status ?? variables.decision,
            reviewNote: response.reviewNote ?? (variables.decision === 'APPROVED' ? null : variables.note ?? current.listing.reviewNote),
            reviewedAt: response.reviewedAt ?? current.listing.reviewedAt,
            product: {
              ...current.listing.product,
              status: response.productStatus ?? current.listing.product.status,
              version: response.version ?? current.listing.product.version,
            },
          },
        };
      });
      toast.success(
        variables.decision === 'APPROVED'
          ? 'Publicación aprobada'
          : variables.decision === 'REJECTED'
            ? 'Publicación rechazada'
            : 'Se pidieron cambios al afiliado',
      );
      void client.invalidateQueries({ queryKey: ['admin', 'affiliate-listings-all'] });
      void client.invalidateQueries({ queryKey: ['admin', 'affiliate-listing', variables.row.id] });
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });

  if (id) {
    return (
      <ListingDetail
        query={detail}
        reviewPending={review.isPending}
        onReview={(decision, note) => {
          if (!detail.data) return;
          review.mutate({ row: detail.data.listing, decision, note });
        }}
      />
    );
  }

  return (
    <Shell
      active="listings"
      title="Publicaciones"
      description="Todas las publicaciones y estados editoriales, con preview y acciones directas."
      action={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>}
    >
      <section className={shared.adminPanel}>
        <div className={shared.adminPanelHeader}>
          <div>
            <span className={shared.adminPanelKicker}>Control editorial</span>
            <h2>Publicaciones</h2>
          </div>
          <select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos los estados</option>
            {['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED'].map((value) => (
              <option key={value} value={value}>{label(value)}</option>
            ))}
          </select>
        </div>
        {query.isLoading ? <Feedback>Cargando publicaciones…</Feedback> : query.isError ? <Feedback error>{adminErrorMessage(query.error)}</Feedback> : (
          <div className={shared.adminPanelBody}>
            <ul className={[shared.adminList, styles.affiliateAdminPublicationsList].filter(Boolean).join(' ')}>
              {query.data.items.map((row) => (
                <li key={row.id}>
                  <div className={[shared.adminListRow, styles.affiliateAdminRow].filter(Boolean).join(' ')}>
                    <div>
                      <Link className={styles.affiliateAdminPublicationName} href={`/admin/affiliates/listings/${row.id}`}>
                        <strong>{row.product.name}</strong>
                        <span>{row.affiliate.publicName} · {label(row.status)} · {row.product.images.length} imágenes</span>
                      </Link>
                    </div>
                    <div className={shared.adminRowActions}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setPreview(row);
                          setPreviewImageId(row.product.images[0]?.id ?? null);
                        }}
                      >
                        <Eye size={15} />Preview
                      </Button>
                      <Link className="button button-ghost" href={`/admin/affiliates/listings/${row.id}`}>Revisar</Link>
                      {row.status === 'PENDING_REVIEW' && (
                        <>
                          <Button variant="secondary" onClick={() => review.mutate({ row, decision: 'APPROVED' })} disabled={review.isPending}>
                            <Check size={15} />Aprobar
                          </Button>
                          <Button variant="ghost" onClick={() => review.mutate({ row, decision: 'CHANGES_REQUESTED' })} disabled={review.isPending}>
                            <X size={15} />Pedir cambios
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {query.data.items.length === 0 && <p className={shared.adminEmptyCopy}>No hay publicaciones para este filtro.</p>}
          </div>
        )}
      </section>
      <Dialog
        open={Boolean(preview)}
        title={preview ? `Preview · ${preview.product.name}` : 'Preview de publicación'}
        description={preview ? `Publicación de ${preview.affiliate.publicName}` : undefined}
        onClose={() => {
          setPreview(null);
          setPreviewImageId(null);
        }}
        className={[shared.adminWideDialog, styles.affiliateAdminPreviewDialog].filter(Boolean).join(' ')}
      >
        {preview && (() => {
          const images = preview.product.images;
          const activeImage = images.find((image) => image.id === previewImageId) ?? images[0] ?? null;
          return (
            <>
              <div className={styles.affiliateAdminPreview}>
                <div className={styles.affiliateAdminPreviewMedia}>
                  <div className={styles.affiliateAdminPreviewImage}>
                    {activeImage
                      ? <Image src={activeImage.url} alt={activeImage.altText ?? preview.product.name} width={560} height={560} unoptimized />
                      : <span>Sin imágenes</span>}
                  </div>
                  {images.length > 1 && (
                    <div className={styles.affiliateAdminPreviewThumbnails} aria-label="Imágenes de la publicación">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
                          type="button"
                          className={image.id === activeImage?.id ? styles.isActive : undefined}
                          onClick={() => setPreviewImageId(image.id)}
                          aria-label={`Ver imagen ${index + 1}`}
                        >
                          <Image src={image.url} alt={image.altText ?? ''} width={72} height={72} unoptimized />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.affiliateAdminPreviewDetails}>
                  <div>
                    <span className={shared.adminPanelKicker}>{label(preview.status)}</span>
                    <h3>{preview.product.name}</h3>
                    <p className={styles.affiliateAdminPreviewSeller}>Vende {preview.affiliate.publicName}</p>
                  </div>
                  <dl className={styles.affiliateAdminPreviewData}>
                    <div><dt>Tipo</dt><dd>{listingKindLabel(preview.product.kind)}</dd></div>
                    <div><dt>Precio</dt><dd className={styles.affiliateAdminPreviewPrice}>{money(preview.product.priceMinor)}</dd></div>
                    <div><dt>Stock</dt><dd>{preview.product.inventory?.available ?? 0} unidades</dd></div>
                    <div><dt>Imágenes</dt><dd>{images.length}</dd></div>
                  </dl>
                  <div className={styles.affiliateAdminPreviewDescription}>
                    <span className={shared.adminPanelKicker}>Descripción</span>
                    <p>{preview.product.description.trim() || 'El afiliado no agregó una descripción.'}</p>
                  </div>
                  <div className={shared.adminDialogActions}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setPreview(null);
                        setPreviewImageId(null);
                      }}
                    >
                      Cerrar
                    </Button>
                    <Link className="button button-primary" href={`/admin/affiliates/listings/${preview.id}`}>
                      Abrir ficha completa
                    </Link>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </Dialog>
    </Shell>
  );
}

function ListingDetail({
  query,
  reviewPending,
  onReview,
}: {
  query: QueryState<{ listing: Listing }> & { refetch?: () => void };
  reviewPending: boolean;
  onReview: (decision: ReviewDecision, note?: string) => void;
}) {
  const [imageId, setImageId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<Exclude<ReviewDecision, 'APPROVED'> | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    if (!query.data?.listing) return;
    setImageId(query.data.listing.product.images[0]?.id ?? null);
  }, [query.data?.listing]);

  if (query.isLoading) {
    return <Shell active="listings" title="Publicación" description="Cargando…"><Feedback>Cargando…</Feedback></Shell>;
  }
  if (query.isError || !query.data) {
    return (
      <Shell active="listings" title="Publicación no encontrada" description="La publicación no está disponible.">
        <Feedback error>{query.error ? adminErrorMessage(query.error) : 'No encontrada'}</Feedback>
      </Shell>
    );
  }

  const item = query.data.listing;
  const images = item.product.images;
  const activeImage = images.find((image) => image.id === imageId) ?? images[0] ?? null;
  const canReview = item.status === 'PENDING_REVIEW';
  const closeReviewDialog = () => {
    if (reviewPending) return;
    setReviewDecision(null);
    setReviewNote('');
  };

  return (
    <Shell
      active="listings"
      title={item.product.name}
      description={`Publicación de ${item.affiliate.publicName} · control editorial`}
      action={<Link className="button button-secondary" href="/admin/affiliates/listings"><ArrowLeft size={16} />Volver</Link>}
    >
      <div className={styles.adminListingDetail}>
        <section className={styles.adminListingHero}>
          <div className={styles.adminListingHeroTop}>
            <span className={styles.adminListingKicker}>Revisión editorial</span>
            <span className={listingStatusClass(item.status)}>{label(item.status)}</span>
          </div>
          <div className={styles.adminListingHeroCopy}>
            <div>
              <h2>{item.product.name}</h2>
              <p>
                Vende{' '}
                <Link href={`/admin/affiliates/sellers/${item.affiliate.id}`}>{item.affiliate.publicName}</Link>
                {item.submittedAt ? ` · Enviada ${date(item.submittedAt)}` : ''}
              </p>
            </div>
            <div className={styles.adminListingPrice}>
              <span>Precio</span>
              <strong>{money(item.product.priceMinor)}</strong>
            </div>
          </div>
        </section>

        <div className={styles.adminListingSummary}>
          <article className={styles.adminListingSummaryCard}>
            <span>Tipo</span>
            <strong>{listingKindLabel(item.product.kind)}</strong>
          </article>
          <article className={styles.adminListingSummaryCard}>
            <span>Stock disponible</span>
            <strong>{item.product.inventory?.available ?? 0}</strong>
          </article>
          <article className={styles.adminListingSummaryCard}>
            <span>Imágenes</span>
            <strong>{images.length}</strong>
          </article>
          <article className={styles.adminListingSummaryCard}>
            <span>Versión</span>
            <strong>{item.product.version}</strong>
          </article>
        </div>

        <div className={styles.adminListingColumns}>
          <div className={styles.adminListingPrimary}>
            <section className={shared.adminPanel}>
              <div className={shared.adminPanelHeader}>
                <div>
                  <span className={shared.adminPanelKicker}>Vista previa</span>
                  <h2>Contenido de la publicación</h2>
                </div>
              </div>
              <div className={shared.adminPanelBody}>
                <div className={styles.affiliateAdminPreview}>
                  <div className={styles.affiliateAdminPreviewMedia}>
                    <div className={styles.affiliateAdminPreviewImage}>
                      {activeImage
                        ? <Image src={activeImage.url} alt={activeImage.altText ?? item.product.name} width={560} height={560} unoptimized />
                        : <span>Sin imágenes</span>}
                    </div>
                    {images.length > 1 && (
                      <div className={styles.affiliateAdminPreviewThumbnails} aria-label="Imágenes de la publicación">
                        {images.map((image, index) => (
                          <button
                            key={image.id}
                            type="button"
                            className={image.id === activeImage?.id ? styles.isActive : undefined}
                            onClick={() => setImageId(image.id)}
                            aria-label={`Ver imagen ${index + 1}`}
                          >
                            <Image src={image.url} alt={image.altText ?? ''} width={72} height={72} unoptimized />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={styles.affiliateAdminPreviewDetails}>
                    <div className={styles.affiliateAdminPreviewDescription}>
                      <span className={shared.adminPanelKicker}>Descripción</span>
                      <p>{item.product.description.trim() || 'El afiliado no agregó una descripción.'}</p>
                    </div>
                    <dl className={styles.affiliateAdminPreviewData}>
                      <div><dt>Precio</dt><dd className={styles.affiliateAdminPreviewPrice}>{money(item.product.priceMinor)}</dd></div>
                      <div><dt>Stock</dt><dd>{item.product.inventory?.available ?? 0} unidades</dd></div>
                      <div><dt>Tipo</dt><dd>{listingKindLabel(item.product.kind)}</dd></div>
                      <div><dt>Estado producto</dt><dd>{label(item.product.status)}</dd></div>
                    </dl>
                    {item.reviewNote && (
                      <div className={styles.adminListingNote}>
                        <span className={shared.adminPanelKicker}>Nota de revisión</span>
                        <p>{item.reviewNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.adminListingAside}>
            <section className={shared.adminPanel}>
              <div className={shared.adminPanelHeader}>
                <div>
                  <span className={shared.adminPanelKicker}>Decisión</span>
                  <h2>Acciones</h2>
                </div>
              </div>
              <div className={[shared.adminPanelBody, styles.adminListingActions].filter(Boolean).join(' ')}>
                {canReview ? (
                  <>
                    <p className="form-hint">Esta publicación está pendiente. Podés aprobarla, pedir cambios o rechazarla.</p>
                    <Button
                      onClick={() => onReview('APPROVED')}
                      disabled={reviewPending}
                    >
                      <Check size={16} />
                      {reviewPending ? 'Guardando…' : 'Aprobar publicación'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setReviewDecision('CHANGES_REQUESTED')}
                      disabled={reviewPending}
                    >
                      <X size={16} />
                      Pedir cambios
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setReviewDecision('REJECTED')}
                      disabled={reviewPending}
                    >
                      Rechazar
                    </Button>
                  </>
                ) : (
                  <div className={styles.adminListingComplete}>
                    <Check size={16} />
                    <div>
                      <strong>Sin acción pendiente</strong>
                      <p>Estado actual: {label(item.status)}{item.reviewedAt ? ` · Revisada ${date(item.reviewedAt)}` : ''}.</p>
                    </div>
                  </div>
                )}
                <Link className="button button-ghost" href={`/admin/affiliates/sellers/${item.affiliate.id}`}>
                  Ver ficha del afiliado
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <Dialog
        open={Boolean(reviewDecision)}
        title={reviewDecision === 'REJECTED' ? 'Rechazar publicación' : 'Pedir cambios'}
        description={
          reviewDecision === 'REJECTED'
            ? 'Indicá el motivo del rechazo. El afiliado va a ver esta nota.'
            : 'Dejá una indicación concreta para que el afiliado pueda corregir la publicación.'
        }
        onClose={closeReviewDialog}
      >
        <form
          className={shared.adminForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (!reviewDecision || reviewNote.trim().length < 3) return;
            onReview(reviewDecision, reviewNote.trim());
            setReviewDecision(null);
            setReviewNote('');
          }}
        >
          <TextareaField
            label="Motivo"
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            minLength={3}
            maxLength={500}
            rows={5}
            placeholder={
              reviewDecision === 'REJECTED'
                ? 'Ej. El producto no cumple las políticas de la tienda.'
                : 'Ej. Agregá una foto del frente y aclará el idioma del producto.'
            }
            required
          />
          <div className={shared.adminDialogActions}>
            <Button type="button" variant="secondary" onClick={closeReviewDialog} disabled={reviewPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={reviewDecision === 'REJECTED' ? 'danger' : 'primary'}
              disabled={reviewPending || reviewNote.trim().length < 3}
            >
              {reviewPending
                ? 'Guardando…'
                : reviewDecision === 'REJECTED'
                  ? 'Confirmar rechazo'
                  : 'Solicitar cambios'}
            </Button>
          </div>
        </form>
      </Dialog>
    </Shell>
  );
}

function Orders({ id }: { id?: string }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'affiliate-orders', status, submitted], queryFn: () => queryPage<SellerOrder>(`/admin/affiliates/seller-orders?pageSize=50&sellerType=AFFILIATE${status ? `&status=${status}` : ''}${submitted ? `&search=${encodeURIComponent(submitted)}` : ''}`) });
  const detail = useQuery({ queryKey: ['admin', 'affiliate-order', id], queryFn: () => adminFetch<{ order: SellerOrder }>(`/admin/affiliates/seller-orders/${id}`).then(payload), enabled: Boolean(id) });
  const transition = useMutation({ mutationFn: ({ row, next }: { row: SellerOrder; next: string }) => adminFetch(`/admin/affiliates/seller-orders/${row.id}/status`, { method: 'POST', body: JSON.stringify({ expectedVersion: row.version, status: next, note: 'Intervención administrativa desde el panel de afiliados.' }) }), onSuccess: () => { toast.success('Estado de venta actualizado'); void client.invalidateQueries({ queryKey: ['admin', 'affiliate-orders'] }); }, onError: (error) => toast.error(adminErrorMessage(error)) });
  const refund = useMutation({ mutationFn: ({ row, input }: { row: SellerOrder; input: RefundInput }) => adminFetch(`/admin/affiliates/seller-orders/${row.id}/refund`, { method: 'POST', body: JSON.stringify({ expectedVersion: row.version, ...input }) }), onSuccess: () => { toast.success('Reembolso registrado'); void client.invalidateQueries({ queryKey: ['admin', 'affiliate-orders'] }); void detail.refetch(); }, onError: (error) => toast.error(adminErrorMessage(error)) });
  if (id) return <OrderDetail query={detail} onTransition={(next) => detail.data && transition.mutate({ row: detail.data.order, next })} onRefund={(input) => detail.data && refund.mutate({ row: detail.data.order, input })} refundPending={refund.isPending} />;
  return (
    <Shell
      active="orders"
      title="Ventas"
      description="Subórdenes por vendedor con estado, importes, entrega, seguimiento y acciones permitidas."
      action={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>}
    >
      <form className={[shared.adminToolbar, styles.affiliateAdminToolbar].filter(Boolean).join(' ')} onSubmit={(event) => { event.preventDefault(); setSubmitted(search.trim()); }}>
        <TextField className={shared.adminSearchField} label="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Número o vendedor" />
        <SelectField label="Estado" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos los estados</option>
          {['PENDING_PAYMENT', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'SHIPPED', 'COMPLETED', 'CANCELLATION_REQUESTED', 'DISPUTED', 'CANCELLED', 'REFUNDED'].map((value) => (
            <option key={value} value={value}>{label(value)}</option>
          ))}
        </SelectField>
        <Button type="submit" variant="secondary"><Search size={16} />Buscar</Button>
      </form>
      <section className={shared.adminPanel}>
        <div className={shared.adminPanelHeader}>
          <div>
            <span className={shared.adminPanelKicker}>Marketplace</span>
            <h2>Subórdenes</h2>
          </div>
          {!query.isLoading && !query.isError ? <span className={shared.adminCountBadge}>{query.data.items.length}</span> : null}
        </div>
        {query.isLoading ? <Feedback>Cargando ventas…</Feedback> : query.isError ? <Feedback error>{adminErrorMessage(query.error)}</Feedback> : (
          <div className={shared.adminPanelBody}>
            <ul className={shared.adminList}>
              {query.data.items.map((row) => (
                <li key={row.id}>
                  <div className={shared.adminListRow}>
                    <Link href={`/admin/affiliates/orders/${row.id}`}>
                      <strong>{row.number}</strong>
                      <span>{row.sellerName} · {label(row.status)} · {money(row.sellerNetMinor)}</span>
                    </Link>
                    <div className={shared.adminRowActions}>
                      <span className={shared.adminBadge}>{label(row.fulfillmentType ?? 'SHIPMENT')}</span>
                      <Link className="button button-ghost" href={`/admin/affiliates/orders/${row.id}`}>Ver detalle</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {query.data.items.length === 0 && <p className={shared.adminEmptyCopy}>No hay ventas para este filtro.</p>}
          </div>
        )}
      </section>
    </Shell>
  );
}

function OrderDetail({ query, onTransition, onRefund, refundPending }: { query: QueryState<{ order: SellerOrder }>; onTransition: (next: string) => void; onRefund: (input: RefundInput) => void; refundPending: boolean }) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [restock, setRestock] = useState(false);

  if (query.isLoading) {
    return <Shell active="orders" title="Venta" description="Cargando…"><Feedback>Cargando…</Feedback></Shell>;
  }
  if (query.isError || !query.data) {
    return (
      <Shell active="orders" title="Venta no encontrada" description="La suborden no está disponible.">
        <Feedback error>{query.error ? adminErrorMessage(query.error) : 'No encontrada'}</Feedback>
      </Shell>
    );
  }

  const order = query.data.order;
  const next = order.status === 'PAID'
    ? 'PREPARING'
    : order.status === 'PREPARING'
      ? (order.fulfillmentType === 'PICKUP' ? 'READY_FOR_PICKUP' : 'SHIPPED')
      : order.status === 'READY_FOR_PICKUP'
        ? 'PICKED_UP'
        : order.status === 'SHIPPED' || order.status === 'PICKED_UP'
          ? 'COMPLETED'
          : null;
  const canRefund = !['PENDING_PAYMENT', 'CANCELLED', 'REFUNDED'].includes(order.status);
  const parentNumber = order.parentOrder?.number ?? order.order?.number ?? '—';
  const affiliateId = order.affiliate?.id ?? order.affiliateId ?? null;
  const isPickup = order.fulfillmentType === 'PICKUP';
  const hasShipmentAddress = Boolean(order.recipientName || order.addressLine1 || order.city || order.province);
  const hasTracking = Boolean(order.carrier || order.trackingCode);
  const closeRefund = () => {
    if (refundPending) return;
    setRefundOpen(false);
    setRefundAmount('');
    setRefundReason('');
    setRefundReference('');
    setRestock(false);
  };

  return (
    <Shell
      active="orders"
      title={`Venta ${order.number}`}
      description={`${order.sellerName} · intervención administrativa`}
      action={<Link className="button button-secondary" href="/admin/affiliates/orders"><ArrowLeft size={16} />Volver</Link>}
    >
      <div className={styles.adminOrderDetail}>
        <section className={styles.adminOrderHero}>
          <div className={styles.adminOrderHeroTop}>
            <span className={styles.adminOrderKicker}>
              <Package size={16} /> Suborden marketplace
            </span>
            <span className={orderStatusClass(order.status)}>{label(order.status)}</span>
          </div>
          <div className={styles.adminOrderHeroCopy}>
            <div>
              <h2>{order.number}</h2>
              <p>
                Vende{' '}
                {affiliateId
                  ? <Link href={`/admin/affiliates/sellers/${affiliateId}`}>{order.sellerName}</Link>
                  : order.sellerName}
                {' · '}Orden {parentNumber}
                {order.parentOrder?.paymentStatus ? ` · Pago ${label(order.parentOrder.paymentStatus)}` : ''}
              </p>
            </div>
            <div className={styles.adminOrderAmount}>
              <span>Neto vendedor</span>
              <strong>{money(order.sellerNetMinor)}</strong>
            </div>
          </div>
        </section>

        <div className={styles.adminOrderSummary}>
          <article className={[styles.adminOrderSummaryCard, styles.isHighlight].filter(Boolean).join(' ')}>
            <span><CircleDollarSign size={15} /> Subtotal</span>
            <strong>{money(order.subtotalMinor)}</strong>
            <small>Productos de esta suborden</small>
          </article>
          <article className={styles.adminOrderSummaryCard}>
            <span><Truck size={15} /> Envío</span>
            <strong>{money(order.shippingMinor)}</strong>
            <small>{label(order.fulfillmentType ?? 'SHIPMENT')}</small>
          </article>
          <article className={styles.adminOrderSummaryCard}>
            <span><ShieldAlert size={15} /> Comisión</span>
            <strong>{money(order.commissionMinor)}</strong>
            <small>Retención de plataforma</small>
          </article>
          <article className={styles.adminOrderSummaryCard}>
            <span><Package size={15} /> Ítems</span>
            <strong>{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</strong>
            <small>{order.items?.length ?? 0} líneas</small>
          </article>
        </div>

        <div className={styles.adminOrderColumns}>
          <div className={styles.adminOrderPrimary}>
            <section className={styles.adminOrderCard}>
              <div className={styles.adminOrderSectionHeading}>
                <div className={styles.adminOrderIcon}><Package size={18} /></div>
                <div>
                  <span>Catálogo</span>
                  <h3>Productos</h3>
                </div>
              </div>
              {order.items?.length ? (
                <div className={styles.adminOrderItems}>
                  {order.items.map((item, index) => (
                    <div className={styles.adminOrderItem} key={item.id ?? `${item.productName ?? item.name}-${index}`}>
                      <div>
                        <strong>{item.productName ?? item.name ?? 'Producto'}</strong>
                        <span>{item.quantity} unidad{item.quantity === 1 ? '' : 'es'}</span>
                      </div>
                      <strong>{money(item.lineTotalMinor)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={shared.adminEmptyCopy}>Sin ítems cargados.</p>
              )}
            </section>

            <section className={styles.adminOrderCard}>
              <div className={styles.adminOrderSectionHeading}>
                <div className={[styles.adminOrderIcon, styles.isCyan].filter(Boolean).join(' ')}>
                  {isPickup ? <MapPin size={18} /> : <Truck size={18} />}
                </div>
                <div>
                  <span>Logística</span>
                  <h3>{isPickup ? 'Retiro en punto' : 'Envío a domicilio'}</h3>
                </div>
              </div>

              {isPickup ? (
                <dl className={styles.adminOrderDelivery}>
                  <div>
                    <dt>Punto</dt>
                    <dd>{order.pickupPointName ?? 'Punto de retiro'}</dd>
                  </div>
                  <div>
                    <dt>Dirección</dt>
                    <dd>{order.pickupPointAddress ?? 'Datos no disponibles hasta acreditar el pago.'}</dd>
                  </div>
                </dl>
              ) : hasShipmentAddress ? (
                <dl className={styles.adminOrderDelivery}>
                  {order.recipientName && <div><dt>Destinatario</dt><dd>{order.recipientName}</dd></div>}
                  {order.recipientPhone && <div><dt>Teléfono</dt><dd>{order.recipientPhone}</dd></div>}
                  {(order.addressLine1 || order.addressLine2) && (
                    <div>
                      <dt>Dirección</dt>
                      <dd>{[order.addressLine1, order.addressLine2].filter(Boolean).join(', ')}</dd>
                    </div>
                  )}
                  {(order.city || order.province || order.postalCode) && (
                    <div>
                      <dt>Localidad</dt>
                      <dd>{[order.city, order.province, order.postalCode].filter(Boolean).join(' · ')}</dd>
                    </div>
                  )}
                  {(order.shippingZoneName || order.shippingRateName) && (
                    <div>
                      <dt>Tarifa</dt>
                      <dd>{[order.shippingZoneName, order.shippingRateName].filter(Boolean).join(' · ')}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className={styles.adminOrderMutedNote}>
                  Los datos de envío se revelan cuando el pago de la orden general está acreditado.
                </p>
              )}

              <div className={styles.adminOrderTracking}>
                <div>
                  <span>Seguimiento</span>
                  <strong>{hasTracking ? [order.carrier, order.trackingCode].filter(Boolean).join(' · ') : 'Sin datos cargados'}</strong>
                </div>
                {order.sellerContactPhone && (
                  <div>
                    <span>Contacto vendedor</span>
                    <strong>{order.sellerContactPhone}</strong>
                  </div>
                )}
              </div>
            </section>

            {order.statusHistory?.length ? (
              <section className={styles.adminOrderCard}>
                <div className={styles.adminOrderSectionHeading}>
                  <div className={[styles.adminOrderIcon, styles.isCyan].filter(Boolean).join(' ')}><Clock3 size={18} /></div>
                  <div>
                    <span>Auditoría</span>
                    <h3>Historial de estados</h3>
                  </div>
                </div>
                <ol className={shared.adminTimeline}>
                  {order.statusHistory.map((event) => (
                    <li key={event.id}>
                      <strong>{label(event.toStatus)}</strong>
                      <span>{date(event.createdAt)}{event.note ? ` · ${event.note}` : ''}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>

          <aside className={styles.adminOrderAside}>
            <section className={[styles.adminOrderCard, styles.adminOrderAsideCard].filter(Boolean).join(' ')}>
              <span className={styles.adminOrderAsideLabel}>Acciones</span>
              <span className={orderStatusClass(order.status)}>{label(order.status)}</span>
              <p>Las transiciones administrativas quedan auditadas en el historial de la suborden.</p>
              <div className={styles.adminOrderActions}>
                {next && next !== 'COMPLETED' && (
                  <Button onClick={() => onTransition(next)}>Pasar a {label(next)}</Button>
                )}
                {next === 'COMPLETED' && (
                  <Button onClick={() => onTransition(next)}>Completar venta</Button>
                )}
                {!next && (
                  <div className={styles.adminOrderComplete}>
                    <Check size={16} />
                    <span>Sin transición disponible en este estado.</span>
                  </div>
                )}
                {canRefund && (
                  <Button variant="danger" onClick={() => setRefundOpen(true)}>Registrar reembolso</Button>
                )}
                {affiliateId && (
                  <Link className="button button-ghost" href={`/admin/affiliates/sellers/${affiliateId}`}>
                    Ver ficha del afiliado
                  </Link>
                )}
              </div>
            </section>

            <section className={[styles.adminOrderCard, styles.adminOrderAsideCard].filter(Boolean).join(' ')}>
              <span className={styles.adminOrderAsideLabel}>Referencias</span>
              <div className={styles.adminOrderMetaList}>
                <div><span>Orden general</span><strong>{parentNumber}</strong></div>
                <div><span>Pago</span><strong>{label(order.parentOrder?.paymentStatus ?? '—')}</strong></div>
                <div><span>Estado orden</span><strong>{label(order.parentOrder?.status ?? '—')}</strong></div>
                <div><span>Versión</span><strong>{order.version}</strong></div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <Dialog
        open={refundOpen && canRefund}
        title="Registrar reembolso"
        description="El reembolso revierte la obligación del afiliado y queda registrado con referencia externa."
        onClose={closeRefund}
      >
        <form
          className={shared.adminForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (refundAmount.trim() && refundReason.trim().length >= 3 && refundReference.trim().length >= 2) {
              onRefund({
                amountMinor: refundAmount.trim(),
                reason: refundReason.trim(),
                externalReference: refundReference.trim(),
                restock,
              });
              closeRefund();
            }
          }}
        >
          <TextField
            label="Monto a reembolsar (centavos USD)"
            inputMode="numeric"
            value={refundAmount}
            onChange={(event) => setRefundAmount(event.target.value.replace(/[^0-9]/g, ''))}
            required
          />
          <TextareaField
            label="Motivo"
            value={refundReason}
            onChange={(event) => setRefundReason(event.target.value)}
            minLength={3}
            maxLength={500}
            required
          />
          <TextField
            label="Referencia externa"
            value={refundReference}
            onChange={(event) => setRefundReference(event.target.value)}
            minLength={2}
            maxLength={150}
            required
          />
          <label className="checkbox-field">
            <input type="checkbox" checked={restock} onChange={(event) => setRestock(event.target.checked)} />
            Reponer stock
          </label>
          <div className={shared.adminDialogActions}>
            <Button type="button" variant="secondary" onClick={closeRefund} disabled={refundPending}>Cancelar</Button>
            <Button
              type="submit"
              variant="danger"
              disabled={refundPending || refundAmount.trim().length === 0 || refundReason.trim().length < 3 || refundReference.trim().length < 2}
            >
              {refundPending ? 'Registrando…' : 'Confirmar reembolso'}
            </Button>
          </div>
        </form>
      </Dialog>
    </Shell>
  );
}

function Queue({ section, id }: { section: 'issues' | 'cancellations'; id?: string }) {
  const [resolution, setResolution] = useState<{ id: string; version: number; kind: 'issue' | 'cancellation' } | null>(null); const [note, setNote] = useState(''); const [decision, setDecision] = useState(section === 'issues' ? 'CONTINUE' : 'REJECTED'); const [refundAmountMinor, setRefundAmountMinor] = useState(''); const [externalReference, setExternalReference] = useState(''); const client = useQueryClient();
  const endpoint = section === 'issues' ? '/admin/affiliates/issues?pageSize=50' : '/admin/affiliates/cancellations?pageSize=50';
  const query = useQuery({ queryKey: ['admin', 'affiliate', section], queryFn: () => queryPage<Issue | Cancellation>(endpoint) });
  const detail = useQuery({ queryKey: ['admin', 'affiliate', section, id], queryFn: () => adminFetch<{ issue: Issue } | { cancellation: Cancellation }>(`${endpoint.split('?')[0]}/${id}`).then(payload), enabled: Boolean(id) });
  const resolve = useMutation({ mutationFn: async (input: { id: string; version: number; kind: 'issue' | 'cancellation'; decision: string; note: string; refundAmountMinor?: string; externalReference?: string }) => adminFetch(`/admin/affiliates/${input.kind === 'issue' ? 'issues' : 'cancellations'}/${input.id}/resolve`, { method: 'POST', body: JSON.stringify({ expectedVersion: input.version, decision: input.decision, note: input.note, ...(input.refundAmountMinor ? { refundAmountMinor: input.refundAmountMinor, externalReference: input.externalReference, restock: true } : {}) }) }), onSuccess: () => { toast.success('Resolución guardada'); setResolution(null); setNote(''); setRefundAmountMinor(''); setExternalReference(''); void client.invalidateQueries({ queryKey: ['admin', 'affiliate', section] }); void detail.refetch(); }, onError: (error) => toast.error(adminErrorMessage(error)) });
  const isIssue = section === 'issues'; const openResolution = (item: Issue | Cancellation) => { setResolution({ id: item.id, version: item.version ?? item.sellerOrder.version, kind: isIssue ? 'issue' : 'cancellation' }); setDecision(isIssue ? 'CONTINUE' : 'REJECTED'); setNote(''); setRefundAmountMinor(''); setExternalReference(''); };
  const record = id && detail.data ? (isIssue ? (detail.data as { issue: Issue }).issue : (detail.data as { cancellation: Cancellation }).cancellation) : null;
  if (id) {
    return (
      <Shell
        active={section}
        title={isIssue ? 'Detalle de incidencia' : 'Detalle de cancelación'}
        description="Resolvé la operación con motivo obligatorio y trazabilidad contable."
        action={<Link className="button button-secondary" href={`/admin/affiliates/${section}`}><ArrowLeft size={16} />Volver</Link>}
      >
        {detail.isLoading ? <Feedback>Cargando…</Feedback> : detail.isError || !record ? <Feedback error>{detail.error ? adminErrorMessage(detail.error) : 'No encontrado'}</Feedback> : (
          <section className={shared.adminPanel}>
            <div className={shared.adminPanelHeader}>
              <div>
                <span className={shared.adminPanelKicker}>{isIssue ? 'Incidencia' : 'Cancelación'}</span>
                <h2>{record.sellerOrder.number} · {record.affiliate.publicName}</h2>
              </div>
              <span className={shared.adminBadge}>{label(record.status)}</span>
            </div>
            <div className={[shared.adminPanelBody, styles.affiliateAdminSectionStack].filter(Boolean).join(' ')}>
              <p>{record.reason}</p>
              <p className="form-hint">Creado: {date(record.createdAt)}</p>
              {(record.status === 'OPEN' || record.status === 'REQUESTED') && (
                <div className={styles.affiliateAdminActionsRow}>
                  <Button variant="secondary" onClick={() => openResolution(record)}>{isIssue ? 'Resolver incidencia' : 'Decidir cancelación'}</Button>
                </div>
              )}
            </div>
          </section>
        )}
        <ResolutionDialog isIssue={isIssue} resolution={resolution} note={note} setNote={setNote} decision={decision} setDecision={setDecision} refundAmountMinor={refundAmountMinor} setRefundAmountMinor={setRefundAmountMinor} externalReference={externalReference} setExternalReference={setExternalReference} resolve={resolve} onClose={() => setResolution(null)} />
      </Shell>
    );
  }
  return (
    <Shell
      active={section}
      title={isIssue ? 'Incidencias' : 'Cancelaciones'}
      description={isIssue ? 'Cola abierta e historial de reclamos, con resolución contable y operativa completa.' : 'Solicitudes de cancelación versionadas con motivo obligatorio y resolución auditada.'}
      action={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>}
    >
      <section className={shared.adminPanel}>
        <div className={shared.adminPanelHeader}>
          <div>
            <span className={shared.adminPanelKicker}>Cola operativa</span>
            <h2>{isIssue ? 'Incidencias abiertas e historial' : 'Solicitudes recibidas'}</h2>
          </div>
          {!query.isLoading && !query.isError ? <span className={shared.adminCountBadge}>{query.data.items.length}</span> : null}
        </div>
        {query.isLoading ? <Feedback>Cargando…</Feedback> : query.isError ? <Feedback error>{adminErrorMessage(query.error)}</Feedback> : (
          <div className={shared.adminPanelBody}>
            <ul className={shared.adminList}>
              {query.data.items.map((item) => (
                <li key={item.id}>
                  <div className={shared.adminListRow}>
                    <Link href={`/admin/affiliates/${section}/${item.id}`}>
                      <strong>{item.sellerOrder.number} · {item.affiliate.publicName}</strong>
                      <span>{item.reason}</span>
                      <small>{date(item.createdAt)} · {label(item.status)}</small>
                    </Link>
                    {item.status === 'OPEN' || item.status === 'REQUESTED' ? (
                      <div className={shared.adminRowActions}>
                        <Button variant="secondary" onClick={() => openResolution(item)}>{isIssue ? 'Resolver' : 'Decidir'}</Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {query.data.items.length === 0 && <p className={shared.adminEmptyCopy}>No hay elementos en esta cola.</p>}
          </div>
        )}
      </section>
      <ResolutionDialog isIssue={isIssue} resolution={resolution} note={note} setNote={setNote} decision={decision} setDecision={setDecision} refundAmountMinor={refundAmountMinor} setRefundAmountMinor={setRefundAmountMinor} externalReference={externalReference} setExternalReference={setExternalReference} resolve={resolve} onClose={() => setResolution(null)} />
    </Shell>
  );
}

function ResolutionDialog({ isIssue, resolution, note, setNote, decision, setDecision, refundAmountMinor, setRefundAmountMinor, externalReference, setExternalReference, resolve, onClose }: { isIssue: boolean; resolution: { id: string; version: number; kind: 'issue' | 'cancellation' } | null; note: string; setNote: (value: string) => void; decision: string; setDecision: (value: string) => void; refundAmountMinor: string; setRefundAmountMinor: (value: string) => void; externalReference: string; setExternalReference: (value: string) => void; resolve: { isPending: boolean; mutate: (input: { id: string; version: number; kind: 'issue' | 'cancellation'; decision: string; note: string; refundAmountMinor?: string; externalReference?: string }) => void }; onClose: () => void }) {
  const needsRefund = decision === 'PARTIAL_REFUND' || decision === 'FULL_REFUND' || (!isIssue && decision === 'APPROVED');
  return <Dialog open={Boolean(resolution)} title={isIssue ? 'Resolver incidencia' : 'Resolver cancelación'} description="El motivo y cualquier devolución quedan registrados en la auditoría." onClose={onClose}><form className={shared.adminForm} onSubmit={(event) => { event.preventDefault(); if (!resolution || note.trim().length < 3 || (needsRefund && (refundAmountMinor.trim().length === 0 || externalReference.trim().length < 2))) return; resolve.mutate({ ...resolution, decision, note: note.trim(), ...(needsRefund ? { refundAmountMinor: refundAmountMinor.trim(), externalReference: externalReference.trim() } : {}) }); }}><label className="field-label" htmlFor="affiliate-resolution-decision">Resolución</label><select id="affiliate-resolution-decision" value={decision} onChange={(event) => setDecision(event.target.value)}>{isIssue ? <><option value="CONTINUE">Continuar operación</option><option value="COMPLETE">Completar venta</option><option value="PARTIAL_REFUND">Completar con reembolso parcial</option><option value="FULL_REFUND">Reembolso total y cierre</option></> : <><option value="REJECTED">Rechazar cancelación</option><option value="APPROVED">Aprobar cancelación</option></>}</select><TextareaField label="Motivo" value={note} onChange={(event) => setNote(event.target.value)} minLength={3} maxLength={500} rows={5} required />{needsRefund && <><TextField label="Monto a reembolsar (centavos USD)" inputMode="numeric" value={refundAmountMinor} onChange={(event) => setRefundAmountMinor(event.target.value.replace(/[^0-9]/g, ''))} required /><TextField label="Referencia externa" value={externalReference} onChange={(event) => setExternalReference(event.target.value)} required /></>}<div className={shared.adminDialogActions}><Button type="button" variant="secondary" onClick={onClose} disabled={resolve.isPending}>Cancelar</Button><Button type="submit" disabled={resolve.isPending || note.trim().length < 3 || (needsRefund && (refundAmountMinor.trim().length === 0 || externalReference.trim().length < 2))}>{resolve.isPending ? 'Guardando…' : 'Guardar resolución'}</Button></div></form></Dialog>;
}

function Payouts({ id }: { id?: string }) {
  return id ? <PayoutDetailView id={id} /> : <PayoutsLegacy />;
}

function PayoutDetailView({ id }: { id: string }) {
  const [externalReference, setExternalReference] = useState('');
  const [revealedDestination, setRevealedDestination] = useState<string | null>(null);
  const client = useQueryClient();
  const detail = useQuery({ queryKey: ['admin', 'affiliate-payout', id], queryFn: () => adminFetch<PayoutDetail>(`/admin/affiliates/payouts/${id}`).then(payload) });
  const process = useMutation({ mutationFn: ({ row, next }: { row: Payout; next: 'PROCESSING' | 'PAID' | 'REJECTED' }) => { if (externalReference.trim().length < 2) throw new Error('Ingresá una referencia externa'); return adminFetch(`/admin/affiliates/payouts/${row.id}/process`, { method: 'POST', body: JSON.stringify({ expectedVersion: row.version, status: next, externalReference: externalReference.trim(), note: 'Procesado desde el panel administrativo.' }) }); }, onSuccess: () => { toast.success('Retiro actualizado'); void client.invalidateQueries({ queryKey: ['admin', 'affiliate-payouts'] }); void detail.refetch(); }, onError: (error) => toast.error(adminErrorMessage(error)) });
  const reveal = useMutation({ mutationFn: () => adminFetch<{ destination: string; expiresInSeconds: number }>(`/admin/affiliates/payouts/${id}/reveal-destination`, { method: 'POST', body: JSON.stringify({}) }).then(payload), onSuccess: (result) => { setRevealedDestination(result.destination); toast.success(`Destino revelado por ${result.expiresInSeconds} segundos`); }, onError: (error) => toast.error(adminErrorMessage(error)) });
  useEffect(() => { if (!revealedDestination) return; const timer = window.setTimeout(() => setRevealedDestination(null), 60_000); return () => window.clearTimeout(timer); }, [revealedDestination]);
  return <Shell active="payouts" title="Detalle de retiro" description="Revisá el saldo del afiliado, protegé su destino y completá el circuito de pago." action={<Link className="button button-secondary" href="/admin/affiliates/payouts"><ArrowLeft size={16} />Volver a retiros</Link>}>
    {detail.isLoading ? <Feedback>Cargando retiro…</Feedback> : detail.isError || !detail.data ? <Feedback error>{detail.error ? adminErrorMessage(detail.error) : 'No encontrado'}</Feedback> : <PayoutDetailContent detail={detail.data} externalReference={externalReference} setExternalReference={setExternalReference} revealedDestination={revealedDestination} revealPending={reveal.isPending} onReveal={() => reveal.mutate()} processPending={process.isPending} onProcess={(next) => process.mutate({ row: detail.data!.payout, next })} />}
  </Shell>;
}

function PayoutDetailContent({ detail, externalReference, setExternalReference, revealedDestination, revealPending, onReveal, processPending, onProcess }: { detail: PayoutDetail; externalReference: string; setExternalReference: (value: string) => void; revealedDestination: string | null; revealPending: boolean; onReveal: () => void; processPending: boolean; onProcess: (next: 'PROCESSING' | 'PAID' | 'REJECTED') => void }) {
  const { payout, availableMinor, ledger } = detail;
  const canProcess = payout.status === 'REQUESTED' || payout.status === 'PROCESSING';
  return <div className={styles.adminPayoutDetail}>
    <section className={styles.adminPayoutHero}>
      <div className={styles.adminPayoutHeroTop}><span className={styles.adminPayoutKicker}><WalletCards size={16} /> Operación financiera</span><span className={payoutStatusClass(payout.status)}>{label(payout.status)}</span></div>
      <div className={styles.adminPayoutHeroCopy}><div><h2>{payout.affiliate.publicName}</h2><p>Solicitud creada el {date(payout.createdAt)}</p></div><div className={styles.adminPayoutAmount}><span>Monto solicitado</span><strong>{money(payout.amountMinor)}</strong></div></div>
    </section>
    <div className={styles.adminPayoutSummary}>
      <article className={[styles.adminPayoutSummaryCard, styles.isHighlight].filter(Boolean).join(' ')}><span><CircleDollarSign size={15} /> Disponible del afiliado</span><strong>{money(availableMinor)}</strong><small>Saldo actual luego de reservar este retiro</small></article>
      <article className={styles.adminPayoutSummaryCard}><span><ArrowDownToLine size={15} /> Importe reservado</span><strong>{money(payout.amountMinor)}</strong><small>Solicitud asociada a este movimiento</small></article>
      <article className={styles.adminPayoutSummaryCard}><span><Landmark size={15} /> Cuenta de destino</span><strong>{payout.destinationLast4 ? `•••• ${payout.destinationLast4}` : 'Sin cuenta'}</strong><small>La cuenta completa permanece protegida</small></article>
    </div>
    <div className={styles.adminPayoutColumns}>
      <div className={styles.adminPayoutPrimary}>
        <section className={styles.adminPayoutCard}><div className={styles.adminPayoutSectionHeading}><div className={styles.adminPayoutIcon}><CircleDollarSign size={18} /></div><div><span>Gestión</span><h3>Procesar retiro</h3></div></div><div className={styles.adminPayoutMeta}><div><span>Referencia registrada</span><strong>{payout.externalReference ?? 'Pendiente de cargar'}</strong></div><div><span>Creado</span><strong>{date(payout.createdAt)}</strong></div></div><div className={styles.adminPayoutReveal}><div><span>Destino bancario</span><strong>{revealedDestination ?? (payout.destinationLast4 ? `Termina en ${payout.destinationLast4}` : 'No configurado')}</strong></div><Button variant="ghost" onClick={onReveal} disabled={revealPending || !payout.destinationLast4}><Eye size={15} />{revealPending ? 'Revelando…' : 'Revelar destino'}</Button></div>{canProcess && <div className={styles.adminPayoutActions}><TextField label="Referencia externa del pago" value={externalReference} onChange={(event) => setExternalReference(event.target.value)} placeholder="Transferencia-2026-001" required /><div className={shared.adminRowActions}>{payout.status === 'REQUESTED' && <Button onClick={() => onProcess('PROCESSING')} disabled={processPending || externalReference.trim().length < 2}>Pasar a procesando</Button>}{payout.status === 'PROCESSING' && <><Button onClick={() => onProcess('PAID')} disabled={processPending || externalReference.trim().length < 2}>Marcar pagado</Button><Button variant="danger" onClick={() => onProcess('REJECTED')} disabled={processPending || externalReference.trim().length < 2}>Rechazar</Button></>}</div></div>}{!canProcess && <div className={styles.adminPayoutComplete}><Check size={16} /> Este retiro ya fue {payout.status === 'PAID' ? 'pagado' : 'rechazado'}.</div>}</section>
        <section className={styles.adminPayoutCard}><div className={styles.adminPayoutSectionHeading}><div className={[styles.adminPayoutIcon, styles.isCyan].filter(Boolean).join(' ')}><Clock3 size={18} /></div><div><span>Contabilidad</span><h3>Movimientos del retiro</h3></div></div><div className={styles.adminPayoutLedger}>{ledger.map((entry) => <div className={styles.adminPayoutLedgerRow} key={entry.id}><div className={styles.adminPayoutLedgerCopy}><span className={styles.adminPayoutLedgerBucket}>{ledgerBucket(entry.bucket)}</span><strong>{ledgerType(entry.type)}</strong><small>{date(entry.createdAt)}</small></div><strong className={`${styles.adminPayoutLedgerAmount} ${entry.amountMinor.startsWith('-') ? styles.isNegative : 'is-positive'}`}>{money(entry.amountMinor)}</strong></div>)}</div></section>
      </div>
      <aside className={styles.adminPayoutAside}><section className={[styles.adminPayoutCard, styles.adminPayoutAsideCard].filter(Boolean).join(' ')}><span className={styles.adminPayoutAsideLabel}>Estado de la operación</span><span className={payoutStatusClass(payout.status)}>{label(payout.status)}</span><p>El saldo disponible se calcula desde el ledger del afiliado y se actualiza con cada movimiento.</p></section><section className={[styles.adminPayoutCard, styles.adminPayoutAsideCard].filter(Boolean).join(' ')}><span className={styles.adminPayoutAsideLabel}>Controles de seguridad</span><div className={styles.adminPayoutSecurityItem}><Eye size={15} /><span>Destino enmascarado por defecto</span></div><div className={styles.adminPayoutSecurityItem}><Check size={15} /><span>Revelación auditada por administrador</span></div></section></aside>
    </div>
  </div>;
}

function PayoutsLegacy({ id }: { id?: string }) {
  const [status, setStatus] = useState(''); const [externalReference, setExternalReference] = useState(''); const [revealedDestination, setRevealedDestination] = useState<string | null>(null); const client = useQueryClient(); const query = useQuery({ queryKey: ['admin', 'affiliate-payouts', status], queryFn: () => queryPage<Payout>(`/admin/affiliates/payouts?pageSize=50${status ? `&status=${status}` : ''}`) });
  const detail = useQuery({ queryKey: ['admin', 'affiliate-payout', id], queryFn: () => adminFetch<{ payout: Payout; ledger: Array<{ id: string; bucket: string; type: string; amountMinor: string }> }>(`/admin/affiliates/payouts/${id}`).then(payload), enabled: Boolean(id) });
  const process = useMutation({ mutationFn: ({ row, next }: { row: Payout; next: 'PROCESSING' | 'PAID' | 'REJECTED' }) => { if (externalReference.trim().length < 2) throw new Error('Ingresá la referencia externa del pago'); return adminFetch(`/admin/affiliates/payouts/${row.id}/process`, { method: 'POST', body: JSON.stringify({ expectedVersion: row.version, status: next, externalReference: externalReference.trim(), note: 'Procesado desde el panel administrativo.' }) }); }, onSuccess: () => { toast.success('Retiro actualizado'); void client.invalidateQueries({ queryKey: ['admin', 'affiliate-payouts'] }); void detail.refetch(); }, onError: (error) => toast.error(adminErrorMessage(error)) });
  const reveal = useMutation({ mutationFn: (payoutId: string) => adminFetch<{ destination: string; expiresInSeconds: number }>(`/admin/affiliates/payouts/${payoutId}/reveal-destination`, { method: 'POST', body: JSON.stringify({}) }).then(payload), onSuccess: (result) => { setRevealedDestination(result.destination); toast.success(`Destino revelado por ${result.expiresInSeconds} segundos`); }, onError: (error) => toast.error(adminErrorMessage(error)) });
  useEffect(() => { if (!revealedDestination) return; const timer = window.setTimeout(() => setRevealedDestination(null), 60_000); return () => window.clearTimeout(timer); }, [revealedDestination]);
  if (id) return <Shell active="payouts" title="Detalle de retiro" description="Destino enmascarado, revelado controlado, referencia externa y movimientos reservados." action={<Link className="button button-secondary" href="/admin/affiliates/payouts"><ArrowLeft size={16} />Volver</Link>}>{detail.isLoading ? <Feedback>Cargando…</Feedback> : detail.isError || !detail.data ? <Feedback error>{detail.error ? adminErrorMessage(detail.error) : 'No encontrado'}</Feedback> : <section className={shared.adminPanel}><div className={shared.adminPanelBody}><h2>{detail.data.payout.affiliate.publicName} · {money(detail.data.payout.amountMinor)}</h2><p>Estado: {label(detail.data.payout.status)} · Destino terminado en {detail.data.payout.destinationLast4 ?? '—'}</p><div className={shared.adminRowActions}><Button variant="ghost" onClick={() => reveal.mutate(detail.data!.payout.id)} disabled={reveal.isPending || !detail.data.payout.destinationLast4}><Eye size={15} />Revelar destino</Button>{revealedDestination && <strong className={styles.adminSensitiveValue}>{revealedDestination}</strong>}</div><p>Referencia registrada: {detail.data.payout.externalReference ?? '—'}</p><TextField label="Referencia externa del pago" value={externalReference} onChange={(event) => setExternalReference(event.target.value)} placeholder="Transferencia-2026-001" required /><div className={shared.adminRowActions}>{detail.data.payout.status === 'REQUESTED' && <Button onClick={() => process.mutate({ row: detail.data.payout, next: 'PROCESSING' })} disabled={process.isPending || externalReference.trim().length < 2}>Pasar a procesando</Button>}{detail.data.payout.status === 'PROCESSING' && <><Button onClick={() => process.mutate({ row: detail.data.payout, next: 'PAID' })} disabled={process.isPending || externalReference.trim().length < 2}>Marcar pagado</Button><Button variant="danger" onClick={() => process.mutate({ row: detail.data.payout, next: 'REJECTED' })} disabled={process.isPending || externalReference.trim().length < 2}>Rechazar</Button></>}</div><h3>Movimientos</h3>{detail.data.ledger.map((entry) => <div className={styles.adminDetailLine} key={entry.id}><span>{entry.bucket} · {entry.type}</span><strong>{money(entry.amountMinor)}</strong></div>)}</div></section>}</Shell>;
  return <Shell active="payouts" title="Retiros" description="Solicitudes con destino enmascarado y flujo en dos pasos: procesando y pagado o rechazado." action={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>}>
    <section className={shared.adminPanel}>
      <div className={shared.adminPanelHeader}>
        <div>
          <span className={shared.adminPanelKicker}>Finanzas</span>
          <h2>Historial de retiros</h2>
        </div>
        <select aria-label="Filtrar retiros" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos</option>
          {['REQUESTED', 'PROCESSING', 'PAID', 'REJECTED'].map((value) => <option key={value} value={value}>{label(value)}</option>)}
        </select>
      </div>
      {query.isLoading ? <Feedback>Cargando retiros…</Feedback> : query.isError ? <Feedback error>{adminErrorMessage(query.error)}</Feedback> : (
        <div className={shared.adminPanelBody}>
          <ul className={shared.adminList}>
            {query.data.items.map((row) => (
              <li key={row.id}>
                <div className={shared.adminListRow}>
                  <Link href={`/admin/affiliates/payouts/${row.id}`}>
                    <strong>{row.affiliate.publicName} · {money(row.amountMinor)}</strong>
                    <span>Destino terminado en {row.destinationLast4 ?? '—'} · {date(row.createdAt)}</span>
                    <small>{label(row.status)}</small>
                  </Link>
                  <div className={shared.adminRowActions}>
                    <Link className="button button-ghost" href={`/admin/affiliates/payouts/${row.id}`}>Ver detalle</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {query.data.items.length === 0 && <p className={shared.adminEmptyCopy}>No hay retiros para este filtro.</p>}
        </div>
      )}
    </section>
  </Shell>;
}

function Settings() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'affiliate-settings'],
    queryFn: () => adminFetch<{ commissionBps: number; autoCompleteDays: number; version: number }>('/admin/affiliates/settings').then(payload),
  });
  const [commission, setCommission] = useState<string | null>(null);
  const [days, setDays] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      if (!query.data) throw new Error('Configuración no disponible');
      return adminFetch('/admin/affiliates/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          expectedVersion: query.data.version,
          commissionBps: commission === null ? query.data.commissionBps : Math.round(Number(commission) * 100),
          autoCompleteDays: Number(days ?? query.data.autoCompleteDays),
        }),
      });
    },
    onSuccess: () => {
      toast.success('Configuración guardada');
      setCommission(null);
      setDays(null);
      void client.invalidateQueries({ queryKey: ['admin', 'affiliate-settings'] });
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });

  const commissionValue = commission ?? (query.data ? String(query.data.commissionBps / 100) : '');
  const daysValue = days ?? (query.data ? String(query.data.autoCompleteDays) : '');
  const commissionNumber = Number(commissionValue);
  const daysNumber = Number(daysValue);
  const commissionError = commissionValue === '' || Number.isNaN(commissionNumber) || commissionNumber < 0 || commissionNumber > 100
    ? 'Ingresá un porcentaje entre 0 y 100.'
    : undefined;
  const daysError = daysValue === '' || Number.isNaN(daysNumber) || !Number.isInteger(daysNumber) || daysNumber < 1 || daysNumber > 90
    ? 'Ingresá un entero entre 1 y 90.'
    : undefined;
  const dirty = commission !== null || days !== null;
  const canSave = dirty && !commissionError && !daysError && !save.isPending;

  return (
    <Shell
      active="settings"
      title="Configuración de afiliados"
      description="Comisión global y plazo de cierre automático. Cada suborden conserva la comisión aplicada al momento de la compra."
      action={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>}
    >
      {query.isLoading ? <Feedback>Cargando configuración…</Feedback> : query.isError ? <Feedback error>{adminErrorMessage(query.error)}</Feedback> : query.data && (
        <div className={styles.affiliateAdminSettings}>
          <div className={styles.adminMetricGrid}>
            <article className={styles.adminMetricCard}>
              <span>Comisión vigente</span>
              <strong>{(query.data.commissionBps / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%</strong>
              <small>Se aplica a nuevas ventas</small>
            </article>
            <article className={styles.adminMetricCard}>
              <span>Cierre automático</span>
              <strong>{query.data.autoCompleteDays} días</strong>
              <small>Sin incidencias abiertas</small>
            </article>
            <article className={styles.adminMetricCard}>
              <span>Versión de reglas</span>
              <strong>v{query.data.version}</strong>
              <small>Control de concurrencia</small>
            </article>
          </div>

          <section className={[shared.adminPanel, styles.affiliateAdminSettingsPanel].filter(Boolean).join(' ')}>
            <div className={[shared.adminPanelHeader, styles.affiliateAdminSettingsHeader].filter(Boolean).join(' ')}>
              <div>
                <span className={shared.adminPanelKicker}>Reglas comerciales</span>
                <h2>Parámetros del programa</h2>
              </div>
              <Settings2 size={20} aria-hidden="true" />
            </div>

            <form
              className={styles.affiliateAdminSettingsForm}
              onSubmit={(event) => {
                event.preventDefault();
                if (!canSave) return;
                save.mutate();
              }}
            >
              <div className={styles.affiliateAdminSettingsFields}>
                <div className={styles.affiliateAdminSettingCard}>
                  <div className={styles.affiliateAdminSettingHeading}>
                    <span className={styles.affiliateAdminSettingIcon} aria-hidden="true"><Percent size={16} /></span>
                    <div>
                      <strong>Comisión de plataforma</strong>
                      <span>Porcentaje que se descuenta de cada nueva venta de afiliado.</span>
                    </div>
                  </div>
                  <TextField
                    label="Comisión global (%)"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputMode="decimal"
                    value={commissionValue}
                    error={commission !== null ? commissionError : undefined}
                    onChange={(event) => setCommission(event.target.value)}
                  />
                </div>

                <div className={styles.affiliateAdminSettingCard}>
                  <div className={styles.affiliateAdminSettingHeading}>
                    <span className={styles.affiliateAdminSettingIcon} aria-hidden="true"><Timer size={16} /></span>
                    <div>
                      <strong>Cierre de ventas</strong>
                      <span>Días de espera antes de completar automáticamente una venta sin incidencias.</span>
                    </div>
                  </div>
                  <TextField
                    label="Días hasta cierre automático"
                    type="number"
                    min="1"
                    max="90"
                    step="1"
                    inputMode="numeric"
                    value={daysValue}
                    error={days !== null ? daysError : undefined}
                    onChange={(event) => setDays(event.target.value)}
                  />
                </div>
              </div>

              <div className={styles.affiliateAdminSettingsNote} role="note">
                <span className={styles.affiliateAdminSettingsNoteIcon} aria-hidden="true"><Info size={16} /></span>
                <div>
                  <strong>La comisión se congela por suborden</strong>
                  <p>Estos cambios solo afectan las nuevas ventas. El historial y las subórdenes ya creadas conservan la comisión aplicada al momento de la compra.</p>
                </div>
              </div>

              <div className={styles.affiliateAdminSettingsActions}>
                <span>{dirty ? 'Hay cambios sin guardar.' : 'Sin cambios pendientes.'}</span>
                <div className={styles.affiliateAdminSettingsActionButtons}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!dirty || save.isPending}
                    onClick={() => {
                      setCommission(null);
                      setDays(null);
                    }}
                  >
                    Descartar
                  </Button>
                  <Button type="submit" disabled={!canSave}>{save.isPending ? 'Guardando…' : 'Guardar configuración'}</Button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </Shell>
  );
}
