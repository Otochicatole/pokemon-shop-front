'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { Archive, ArrowLeft, CheckCircle2, ClipboardList, FilePlus2, ImagePlus, LayoutDashboard, MapPin, Package, Pencil, Plus, Store, Trash2, Truck, WalletCards, Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { ApiError } from '@/shared/api/client';
import { formatDate } from '@/shared/lib/format';
import { BASE_CURRENCY } from '@/shared/lib/currency';
import {
  archiveAffiliateListing,
  createAffiliateListing,
  createAffiliatePickupPoint,
  createAffiliateShippingRate,
  createAffiliateShippingZone,
  deleteAffiliateImage,
  deleteAffiliateListing,
  getAffiliateBalance,
  getAffiliateLogistics,
  getAffiliateProfile,
  listAffiliatePayouts,
  listAffiliateListings,
  listAffiliateOrders,
  requestAffiliateOrderCancellation,
  requestAffiliatePayout,
  submitAffiliateListing,
  updateAffiliateListing,
  updateAffiliateOrderStatus,
  updateAffiliateProfile,
  uploadAffiliateImages,
} from '../infrastructure/api';
import type { AffiliateBalance, AffiliateListing, AffiliateLogistics, AffiliateOrder, AffiliateProfile } from '../domain/contracts';
import styles from './affiliate-portal.module.css';

type ActiveTab = 'dashboard' | 'listings' | 'new' | 'orders' | 'balance' | 'logistics' | 'settings';
type ListingKind = 'SEALED_PRODUCT' | 'ACCESSORY';
type QueryResult<T> = UseQueryResult<T, Error>;

const tabs: Array<{ href: string; label: string; key: ActiveTab; icon: typeof LayoutDashboard }> = [
  { href: '/affiliate', label: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/affiliate/listings', label: 'Publicaciones', key: 'listings', icon: Package },
  { href: '/affiliate/listings/new', label: 'Nueva publicación', key: 'new', icon: FilePlus2 },
  { href: '/affiliate/orders', label: 'Ventas', key: 'orders', icon: ClipboardList },
  { href: '/affiliate/balance', label: 'Saldo y retiros', key: 'balance', icon: WalletCards },
  { href: '/affiliate/logistics', label: 'Logística', key: 'logistics', icon: Truck },
  { href: '/affiliate/settings', label: 'Configuración', key: 'settings', icon: Settings },
];

const listingStatusLabels: Record<string, string> = { DRAFT: 'Borrador', PENDING_REVIEW: 'En revisión', CHANGES_REQUESTED: 'Cambios solicitados', REJECTED: 'Rechazada', APPROVED: 'Aprobada' };
const orderStatusLabels: Record<string, string> = { PENDING_PAYMENT: 'Pendiente de pago', PAYMENT_REVIEW: 'Pago en revisión', PAID: 'Pagada', PREPARING: 'Preparando', READY_FOR_PICKUP: 'Lista para retirar', PICKED_UP: 'Retirada', SHIPPED: 'Enviada', COMPLETED: 'Completada', CANCELLATION_REQUESTED: 'Cancelación solicitada', CANCELLED: 'Cancelada', REFUNDED: 'Reembolsada', DISPUTED: 'En disputa' };

function dataError(error: unknown) { return error instanceof Error ? error.message : 'No se pudo completar la operación'; }
function listingStatusLabel(status: string) { return listingStatusLabels[status] ?? status; }
function orderStatusLabel(status: string) { return orderStatusLabels[status] ?? status; }
function statusClass(status: string) { return status.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
function statusModifier(status: string) {
  const key = ('is-' + statusClass(status)).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as keyof typeof styles;
  return styles[key] ?? '';
}
function formatMinor(amountMinor: string | undefined) { if (amountMinor === undefined) return '—'; return new Intl.NumberFormat('es-AR', { style: 'currency', currency: BASE_CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(BigInt(amountMinor)) / 100); }
function parseMinor(value: string) { const normalized = value.trim().replace(',', '.'); if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null; const [units, decimals = ''] = normalized.split('.'); return (BigInt(units) * 100n + BigInt((decimals + '00').slice(0, 2))).toString(); }
function minorInput(value: string) { return (Number(BigInt(value)) / 100).toFixed(2); }
function activeTab(section: string[]) { if (section[0] === 'listings' && section[1] === 'new') return 'new' as const; if (section[0] === 'listings') return 'listings' as const; if (section[0] === 'orders') return 'orders' as const; if (section[0] === 'balance') return 'balance' as const; if (section[0] === 'logistics') return 'logistics' as const; if (section[0] === 'settings') return 'settings' as const; return 'dashboard' as const; }

function AffiliateLayout({ profile, active, children }: { profile: AffiliateProfile; active: ActiveTab; children: React.ReactNode }) {
  const visibleTabs = profile.status === 'ACTIVE' ? tabs : tabs.filter((tab) => ['dashboard', 'listings', 'orders', 'balance'].includes(tab.key));
  return <div className={styles.affiliateShell}><aside className={styles.affiliateSidebar}><div className={styles.affiliateBrand}><span>CS</span><div><strong>Portal afiliado</strong><small>{profile.publicName}</small></div></div><nav aria-label="Portal de afiliado">{visibleTabs.map(({ href, label, key, icon: Icon }) => <Link key={href} href={href} className={active === key ? styles.isActive : undefined} aria-current={active === key ? 'page' : undefined}><Icon size={17} />{label}</Link>)}</nav><Link className={styles.affiliateBackStore} href="/"><Store size={16} />Volver a la tienda</Link></aside><main className={styles.affiliateMain}>{children}</main></div>;
}

function AffiliateHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className={styles.affiliateHeader}><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className={styles.affiliateHeaderDescription}>{description}</p>}</div>{action && <div className={styles.affiliateHeaderAction}>{action}</div>}</header>;
}

function AffiliateQueryError({ message }: { message: string }) { return <div className={[styles.affiliateFeedback, styles.isError].filter(Boolean).join(' ')} role="alert"><strong>No pudimos cargar esta sección</strong><span>{message}</span></div>; }
function AffiliateLoading() { return <div className={styles.affiliateLoading}>Cargando información…</div>; }

export function AffiliatePortal() {
  const router = useRouter();
  const params = useParams<{ section?: string[] }>();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['affiliate', 'profile'], queryFn: getAffiliateProfile, retry: false });
  const section = params.section?.filter(Boolean) ?? [];
  const active = activeTab(section);
  const listings = useQuery({ queryKey: ['affiliate', 'listings'], queryFn: listAffiliateListings, enabled: profile.isSuccess });
  const orders = useQuery({ queryKey: ['affiliate', 'orders'], queryFn: listAffiliateOrders, enabled: profile.isSuccess });
  const balance = useQuery({ queryKey: ['affiliate', 'balance'], queryFn: getAffiliateBalance, enabled: profile.isSuccess });
  const logistics = useQuery({ queryKey: ['affiliate', 'logistics'], queryFn: getAffiliateLogistics, enabled: profile.isSuccess && active === 'logistics' });
  const profileErrorStatus = profile.error instanceof ApiError ? profile.error.problem.status : null;

  useEffect(() => { if (profileErrorStatus === 401) router.replace('/auth/login?next=/affiliate'); }, [profileErrorStatus, router]);
  if (profile.isLoading) return <div className={styles.affiliateLoading}>Cargando portal de afiliados…</div>;
  if (profile.isError || !profile.data) return <main className={styles.affiliateAccessPage}><div className={styles.affiliateAccessCard}><p className="eyebrow">Portal de afiliados</p><h1>Acceso no disponible</h1><p>{profileErrorStatus === 403 ? 'Tu cuenta todavía no está habilitada como afiliado o fue suspendida. Contactá a la administración para continuar.' : dataError(profile.error)}</p><Link className="button button-secondary" href="/">Volver a la tienda</Link></div></main>;

  const refreshAffiliate = () => queryClient.invalidateQueries({ queryKey: ['affiliate'] });
  const listingTarget = section[0] === 'listings' && section[1] && section[1] !== 'new' ? listings.data?.find((listing) => listing.id === section[1]) : undefined;
  const orderTarget = section[0] === 'orders' && section[1] ? orders.data?.find((order) => order.id === section[1]) : undefined;
  if (active === 'new') return <AffiliateLayout profile={profile.data} active="new">{profile.data.status === 'ACTIVE' ? <AffiliateNewListing /> : <AffiliateSuspendedNotice />}</AffiliateLayout>;
  if (listingTarget) return <AffiliateLayout profile={profile.data} active="listings">{profile.data.status === 'ACTIVE' ? <AffiliateListingEditor listing={listingTarget} onSaved={refreshAffiliate} /> : <AffiliateListingReadOnly listing={listingTarget} />}</AffiliateLayout>;
  if (orderTarget) return <AffiliateLayout profile={profile.data} active="orders"><AffiliateOrderDetailView order={orderTarget} onRefresh={refreshAffiliate} /></AffiliateLayout>;
  if (section[0] === 'listings' && listings.isLoading) return <AffiliateLayout profile={profile.data} active="listings"><AffiliateLoading /></AffiliateLayout>;
  if (section[0] === 'listings' && section[1]) return <AffiliateLayout profile={profile.data} active="listings"><AffiliateHeader eyebrow="Catálogo del afiliado" title="Publicación no encontrada" description="El borrador puede haber sido eliminado o ya no pertenece a tu cuenta." action={<Link className="button button-secondary" href="/affiliate/listings"><ArrowLeft size={16} />Volver a publicaciones</Link>} /></AffiliateLayout>;

  const content = active === 'dashboard' ? <AffiliateDashboard profile={profile.data} listings={listings.data ?? []} orders={orders.data ?? []} balance={balance.data} listingsLoading={listings.isLoading} /> : active === 'listings' ? <AffiliateListingsView query={listings} onRefresh={refreshAffiliate} profile={profile.data} /> : active === 'orders' ? <AffiliateOrdersView query={orders} onRefresh={refreshAffiliate} /> : active === 'balance' ? <AffiliateBalanceView query={balance} profile={profile.data} /> : profile.data.status === 'SUSPENDED' ? <AffiliateSuspendedNotice /> : active === 'logistics' ? <AffiliateLogisticsView query={logistics} onRefresh={refreshAffiliate} /> : <AffiliateSettingsView profile={profile.data} />;
  return <AffiliateLayout profile={profile.data} active={active}>{content}</AffiliateLayout>;
}

function AffiliateDashboard({ profile, listings, orders, balance, listingsLoading }: { profile: AffiliateProfile; listings: AffiliateListing[]; orders: AffiliateOrder[]; balance?: AffiliateBalance; listingsLoading: boolean }) {
  const activeOrders = orders.filter((order) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)).length;
  const active = profile.status === 'ACTIVE';
  return <><AffiliateHeader eyebrow="Central de vendedores" title={profile.publicName} description="Administrá tus publicaciones, prepará las ventas y mantené actualizada la logística de cada producto." action={<span className={`${styles.affiliateStatus} ${active ? styles.isActive : styles.isSuspended}`}>{active ? 'Afiliado activo' : 'Cuenta suspendida'}</span>} /><section className={styles.affiliateGrid} aria-label="Resumen del afiliado"><article className={styles.affiliateStat}><span>Publicaciones</span><strong>{listingsLoading ? '…' : listings.length}</strong><small>Borradores y publicaciones activas</small></article><article className={styles.affiliateStat}><span>Ventas activas</span><strong>{orders.length ? activeOrders : '0'}</strong><small>Pedidos pendientes de entrega</small></article><article className={[styles.affiliateStat, styles.affiliateStatHighlight].join(' ')}><span>Saldo disponible</span><strong>{formatMinor(balance?.availableMinor)}</strong><small>Listo para solicitar retiro</small></article></section><section className={styles.affiliatePanel}><div className={styles.affiliatePanelHeading}><div className={styles.affiliatePanelHeadingCopy}><span className={styles.affiliatePanelIcon} aria-hidden="true"><Package size={18} /></span><div><p className="eyebrow">Catálogo del afiliado</p><h2>Publicaciones recientes</h2></div></div>{active && <Link className="button button-primary" href="/affiliate/listings/new"><FilePlus2 size={16} />Nueva publicación</Link>}</div>{listingsLoading ? <AffiliateLoading /> : listings.length === 0 ? <AffiliateEmptyListing editable={active} /> : <div className={styles.affiliateListingList}>{listings.slice(0, 8).map((listing) => <AffiliateListingRow key={listing.id} listing={listing} editable={active} />)}</div>}<Link className={styles.affiliatePanelLink} href="/affiliate/listings">Ver todas las publicaciones →</Link></section>{active && <section className={[styles.affiliatePanel, styles.affiliateNextSteps].filter(Boolean).join(' ')}><div className={styles.affiliatePanelHeadingCopy}><span className={`${styles.affiliatePanelIcon} ${styles.affiliatePanelIconAccent}`} aria-hidden="true"><CheckCircle2 size={18} /></span><div><p className="eyebrow">Para empezar</p><h2>Completá el circuito de venta</h2></div></div><div className={styles.affiliateStepList}><Link href="/affiliate/listings/new"><span>01</span><div><strong>Creá una publicación</strong><small>Precio, stock e imágenes claras.</small></div></Link><Link href="/affiliate/logistics"><span>02</span><div><strong>Configurá la logística</strong><small>Definí zonas, tarifas o puntos de retiro.</small></div></Link><Link href="/affiliate/orders"><span>03</span><div><strong>Gestioná tus ventas</strong><small>Actualizá el estado hasta completar la entrega.</small></div></Link></div></section>}</>;
}

function AffiliateSuspendedNotice() { return <><AffiliateHeader eyebrow="Acceso limitado" title="Cuenta suspendida" description="Podés consultar tus publicaciones, ventas y saldo, y terminar entregas ya pagadas. Las nuevas publicaciones, cambios de logística y retiros están bloqueados." /><section className={styles.affiliatePanel}><div className={styles.affiliateFeedback}><strong>Operación restringida</strong><span>Contactá a administración si necesitás revisar la suspensión.</span></div></section></>; }

function AffiliateListingReadOnly({ listing }: { listing: AffiliateListing }) { return <><AffiliateHeader eyebrow="Publicación" title={listing.product.name} description={`Estado actual: ${listingStatusLabel(listing.status)}`} action={<Link className="button button-secondary" href="/affiliate/listings">Volver</Link>} /><section className={styles.affiliatePanel}><div className={styles.affiliateOrderMeta}><span>Precio <strong>{formatMinor(listing.product.priceMinor)}</strong></span><span>Stock <strong>{listing.product.inventory?.available ?? 0}</strong></span><span>Versión <strong>{listing.product.version}</strong></span></div><p>{listing.product.description || 'Sin descripción.'}</p>{listing.reviewNote && <p className={styles.affiliateReviewNote}>Nota de revisión: {listing.reviewNote}</p>}</section></>; }

function AffiliateEmptyListing({ editable = true }: { editable?: boolean }) { return <div className={styles.affiliateEmpty}><Package size={28} /><p>Todavía no tenés publicaciones.</p>{editable && <Link href="/affiliate/listings/new">Crear la primera</Link>}</div>; }

function AffiliateListingsView({ query, onRefresh, profile }: { query: QueryResult<AffiliateListing[]>; onRefresh: () => void; profile: AffiliateProfile }) {
  const queryClient = useQueryClient();
  const submit = useMutation({
    mutationFn: submitAffiliateListing,
    onSuccess: (result) => {
      // La respuesta confirma el estado real. Actualizamos la fila antes de
      // invalidar para que el botón desaparezca sin depender del tiempo de red.
      queryClient.setQueryData<AffiliateListing[]>(['affiliate', 'listings'], (current) => current?.map((listing) => listing.id === result.id ? { ...listing, status: result.status } : listing));
      toast.success('Publicación enviada a revisión');
      onRefresh();
    },
    onError: (error) => toast.error(dataError(error)),
  });
  const archive = useMutation({ mutationFn: ({ id, version }: { id: string; version: number }) => archiveAffiliateListing(id, version), onSuccess: () => { toast.success('Publicación archivada'); onRefresh(); }, onError: (error) => toast.error(dataError(error)) });
  const remove = useMutation({ mutationFn: ({ id, version }: { id: string; version: number }) => deleteAffiliateListing(id, version), onSuccess: () => { toast.success('Borrador eliminado'); void queryClient.invalidateQueries({ queryKey: ['affiliate'] }); }, onError: (error) => toast.error(dataError(error)) });
  const rows = query.data ?? [];
  return <><AffiliateHeader eyebrow="Catálogo del afiliado" title="Publicaciones" description="Los cambios sobre una publicación aprobada vuelven a borrador y requieren una nueva revisión." action={<><span className={styles.affiliateCountBadge}>{rows.length}</span><Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>Actualizar</Button>{profile.status === 'ACTIVE' && <Link className="button button-primary" href="/affiliate/listings/new"><Plus size={16} />Nueva publicación</Link>}</>} />{query.isLoading ? <AffiliateLoading /> : query.isError ? <AffiliateQueryError message={dataError(query.error)} /> : rows.length === 0 ? <section className={styles.affiliatePanel}><AffiliateEmptyListing editable={profile.status === 'ACTIVE'} /></section> : <section className={styles.affiliatePanel}><div className={styles.affiliatePanelHeading}><div className={styles.affiliatePanelHeadingCopy}><span className={styles.affiliatePanelIcon} aria-hidden="true"><Package size={18} /></span><div><p className="eyebrow">Inventario</p><h2>Todas las publicaciones</h2></div></div></div><div className={styles.affiliateListingList}>{rows.map((listing) => <AffiliateListingRow key={listing.id} listing={listing} editable={profile.status === 'ACTIVE'} onSubmit={() => submit.mutate(listing.id)} onArchive={() => archive.mutate({ id: listing.id, version: listing.product.version })} onDelete={() => remove.mutate({ id: listing.id, version: listing.product.version })} busy={submit.isPending || archive.isPending || remove.isPending} detailed />)}</div></section>}</>;
}

function AffiliateListingRow({ listing, onSubmit, onArchive, onDelete, busy = false, detailed = false, editable = true }: { listing: AffiliateListing; onSubmit?: () => void; onArchive?: () => void; onDelete?: () => void; busy?: boolean; detailed?: boolean; editable?: boolean }) {
  const canSubmit = ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(listing.status);
  return <article className={styles.affiliateListingRow}><div className={styles.affiliateListingCopy}><strong>{listing.product.name}</strong><span>{listing.product.kind === 'SEALED_PRODUCT' ? 'Producto sellado' : 'Accesorio'} · {formatMinor(listing.product.priceMinor)} · Stock {listing.product.inventory?.available ?? 0}</span>{detailed && listing.reviewNote && <small className={styles.affiliateReviewNote}>Nota de revisión: {listing.reviewNote}</small>}</div><span className={`${styles.affiliateListingStatus} ${statusModifier(listing.status)}`}>{listingStatusLabel(listing.status)}</span>{editable && <div className={styles.affiliateRowActions}><Link className="button button-ghost" href={`/affiliate/listings/${listing.id}`}><Pencil size={14} />Editar</Link>{canSubmit && onSubmit && <Button variant="secondary" onClick={onSubmit} disabled={busy}><CheckCircle2 size={15} />Enviar a revisión</Button>}{listing.status === 'APPROVED' && onArchive && <Button variant="ghost" onClick={onArchive} disabled={busy}><Archive size={14} />Archivar</Button>}{canSubmit && onDelete && <Button variant="ghost" onClick={onDelete} disabled={busy}><Trash2 size={15} />Eliminar</Button>}</div>}</article>;
}

function AffiliateOrdersView({ query, onRefresh }: { query: QueryResult<AffiliateOrder[]>; onRefresh: () => void }) {
  const [cancelOpen, setCancelOpen] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const update = useMutation({ mutationFn: ({ id, expectedVersion, status }: { id: string; expectedVersion: number; status: string }) => updateAffiliateOrderStatus(id, { expectedVersion, status }), onSuccess: () => { toast.success('Estado de la venta actualizado'); onRefresh(); }, onError: (error) => toast.error(dataError(error)) });
  const cancel = useMutation({ mutationFn: ({ id, expectedVersion, note }: { id: string; expectedVersion: number; note: string }) => requestAffiliateOrderCancellation(id, { expectedVersion, note }), onSuccess: () => { toast.success('Solicitud de cancelación enviada'); setCancelOpen(null); setCancelNote(''); onRefresh(); }, onError: (error) => toast.error(dataError(error)) });
  const nextStatus = (order: AffiliateOrder) => order.allowedActions.includes('START_PREPARING') ? 'PREPARING' : order.allowedActions.includes('READY_FOR_PICKUP') ? 'READY_FOR_PICKUP' : order.allowedActions.includes('MARK_SHIPPED') ? 'SHIPPED' : order.allowedActions.includes('MARK_PICKED_UP') ? 'PICKED_UP' : null;
  const rows = query.data ?? [];
  return <><AffiliateHeader eyebrow="Operación comercial" title="Ventas" description="Actualizá la preparación y la entrega. La confirmación final y la liberación del saldo quedan fuera del control del afiliado." action={<><span className={styles.affiliateCountBadge}>{rows.length}</span><Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>Actualizar</Button></>} />{query.isLoading ? <AffiliateLoading /> : query.isError ? <AffiliateQueryError message={dataError(query.error)} /> : rows.length === 0 ? <section className={styles.affiliatePanel}><div className={styles.affiliateEmpty}><ClipboardList size={28} /><p>Todavía no tenés ventas.</p><span>Cuando alguien compre uno de tus productos, aparecerá acá.</span></div></section> : <section className={styles.affiliatePanel}><div className={styles.affiliatePanelHeading}><div className={styles.affiliatePanelHeadingCopy}><span className={styles.affiliatePanelIcon} aria-hidden="true"><ClipboardList size={18} /></span><div><p className="eyebrow">Pedidos</p><h2>Ventas activas y cerradas</h2></div></div></div><div className={styles.affiliateOrderList}>{rows.map((order) => { const next = nextStatus(order); const cancellable = order.allowedActions.includes('REQUEST_CANCELLATION'); return <article className={styles.affiliateOrderCard} key={order.id}><div className={styles.affiliateOrderHeading}><div><span className={styles.affiliateOrderNumber}>{order.number}</span><h2>{order.sellerName}</h2></div><span className={`${styles.affiliateListingStatus} ${statusModifier(order.status)}`}>{orderStatusLabel(order.status)}</span></div><div className={styles.affiliateOrderMeta}><span>Subtotal <strong>{formatMinor(order.subtotalMinor)}</strong></span><span>Comisión <strong>{formatMinor(order.commissionMinor)}</strong></span><span>Tu neto <strong className={styles.affiliateMoneyPositive}>{formatMinor(order.sellerNetMinor)}</strong></span></div><div className={styles.affiliateOrderItems}>{order.items.map((item, index) => <span key={`${order.id}-${index}`}>{item.productName ?? item.name ?? 'Producto'} × {item.quantity}</span>)}</div><div className={styles.affiliateOrderActions}><Link className="button button-ghost" href={`/affiliate/orders/${order.id}`}>Ver detalle</Link>{next && <Button onClick={() => update.mutate({ id: order.id, expectedVersion: order.version, status: next })} disabled={update.isPending}>{next === 'PREPARING' ? 'Empezar a preparar' : next === 'SHIPPED' ? 'Marcar como enviada' : next === 'READY_FOR_PICKUP' ? 'Lista para retirar' : 'Marcar retirada'}</Button>}{cancellable && <Button variant="ghost" onClick={() => { setCancelOpen(cancelOpen === order.id ? null : order.id); setCancelNote(''); }}>Solicitar cancelación</Button>}</div>{cancelOpen === order.id && <form className={styles.affiliateInlineForm} onSubmit={(event) => { event.preventDefault(); if (cancelNote.trim().length < 3) return toast.error('Explicá el motivo de la cancelación'); cancel.mutate({ id: order.id, expectedVersion: order.version, note: cancelNote.trim() }); }}><label>Motivo<textarea value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} minLength={3} maxLength={500} rows={3} required /></label><div className={styles.affiliateRowActions}><Button type="button" variant="ghost" onClick={() => setCancelOpen(null)}>Volver</Button><Button type="submit" variant="danger" disabled={cancel.isPending}>{cancel.isPending ? 'Enviando…' : 'Enviar solicitud'}</Button></div></form>}</article>; })}</div></section>}</>;
}

function AffiliateOrderDetailView({ order, onRefresh }: { order: AffiliateOrder; onRefresh: () => void }) {
  const [carrier, setCarrier] = useState(order.carrier ?? ''); const [trackingCode, setTrackingCode] = useState(order.trackingCode ?? '');
  const update = useMutation({ mutationFn: (status: string) => updateAffiliateOrderStatus(order.id, { expectedVersion: order.version, status, carrier: carrier.trim() || null, trackingCode: trackingCode.trim() || null, note: 'Actualización desde el portal del afiliado.' }), onSuccess: () => { toast.success('Venta actualizada'); onRefresh(); }, onError: (error) => toast.error(dataError(error)) });
  const next = order.allowedActions.includes('START_PREPARING') ? 'PREPARING' : order.allowedActions.includes('READY_FOR_PICKUP') ? 'READY_FOR_PICKUP' : order.allowedActions.includes('MARK_SHIPPED') ? 'SHIPPED' : order.allowedActions.includes('MARK_PICKED_UP') ? 'PICKED_UP' : null;
  return <><AffiliateHeader eyebrow="Detalle de venta" title={order.number} description={`${order.sellerName} · ${orderStatusLabel(order.status)}`} action={<Link className="button button-secondary" href="/affiliate/orders"><ArrowLeft size={16} />Volver a ventas</Link>} /><section className={styles.affiliatePanel}><div className={styles.affiliateOrderMeta}><span>Subtotal <strong>{formatMinor(order.subtotalMinor)}</strong></span><span>Comisión <strong>{formatMinor(order.commissionMinor)}</strong></span><span>Neto pendiente <strong className={styles.affiliateMoneyPositive}>{formatMinor(order.sellerNetMinor)}</strong></span></div><div className={styles.affiliateOrderItems}>{order.items.map((item, index) => <span key={`${order.id}-${index}`}>{item.productName ?? item.name ?? 'Producto'} × {item.quantity}</span>)}</div>{order.status === 'PREPARING' && order.fulfillmentType === 'SHIPMENT' && <div className={styles.affiliateInlineGrid}><label>Transportista<input value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Opcional" /></label><label>Código de seguimiento<input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="Opcional" /></label></div>}<div className={styles.affiliateOrderActions}>{next && <Button onClick={() => update.mutate(next)} disabled={update.isPending}>{update.isPending ? 'Guardando…' : next === 'PREPARING' ? 'Empezar a preparar' : next === 'SHIPPED' ? 'Marcar como enviada' : next === 'READY_FOR_PICKUP' ? 'Lista para retirar' : 'Marcar retirada'}</Button>}{order.status === 'SHIPPED' || order.status === 'PICKED_UP' ? <p className="form-hint">La confirmación final la realiza el comprador o el cierre automático del sistema.</p> : null}</div></section><section className={styles.affiliatePanel}><div className={styles.affiliatePanelHeading}><div><p className="eyebrow">Historial</p><h2>Timeline de entrega</h2></div></div>{order.statusHistory.length ? <ol className={styles.orderTimeline}>{order.statusHistory.map((event, index) => <li className={index === order.statusHistory.length - 1 ? styles.isCurrent : undefined} key={event.id}><span className={styles.orderTimelineMarker} aria-hidden="true" /><div><strong>{orderStatusLabel(event.toStatus)}</strong><span>{formatDate(event.createdAt)}{event.note ? ` · ${event.note}` : ''}</span></div></li>)}</ol> : <p className={styles.affiliateMuted}>Todavía no hay eventos.</p>}</section></>;
}

function AffiliateBalanceView({ query, profile }: { query: QueryResult<AffiliateBalance>; profile: AffiliateProfile }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [payoutPage, setPayoutPage] = useState(1);
  const [historyTab, setHistoryTab] = useState<'entries' | 'payouts'>('entries');
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const canRequestPayout = profile.status === 'ACTIVE';
  const payout = useMutation({
    mutationFn: requestAffiliatePayout,
    onSuccess: () => {
      toast.success('Solicitud de retiro enviada');
      setAmount('');
      setPayoutModalOpen(false);
      setHistoryTab('payouts');
      setPayoutPage(1);
      void query.refetch();
      void queryClient.invalidateQueries({ queryKey: ['affiliate', 'payouts'] });
    },
    onError: (error) => toast.error(dataError(error)),
  });
  const payoutHistory = useQuery({
    queryKey: ['affiliate', 'payouts', payoutPage],
    queryFn: () => listAffiliatePayouts(payoutPage),
    enabled: query.isSuccess && historyTab === 'payouts',
  });
  const balance = query.data;
  const amountMinor = parseMinor(amount);

  useEffect(() => {
    if (!payoutModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPayoutModalOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [payoutModalOpen]);

  function submitPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!amountMinor || amountMinor === '0') return toast.error('Ingresá un importe válido');
    if (BigInt(amountMinor) > BigInt(balance?.availableMinor ?? '0')) return toast.error('El importe supera tu saldo disponible');
    payout.mutate(amountMinor);
  }

  const entries = balance?.entries ?? [];
  return <>
    <AffiliateHeader eyebrow="Finanzas del afiliado" title="Saldo y retiros" description="Las ventas completadas quedan disponibles. Los retiros se procesan desde administración." action={<span className={styles.affiliateAccountChip}>{profile.payoutAccountLast4 ? `Cuenta terminada en ${profile.payoutAccountLast4}` : 'Cuenta de retiro pendiente'}</span>} />
    {query.isLoading ? <AffiliateLoading /> : query.isError ? <AffiliateQueryError message={dataError(query.error)} /> : <>
      <section className={[styles.affiliateGrid, styles.affiliateBalanceGrid].filter(Boolean).join(' ')}>
        <article className={styles.affiliateStat}><span>Pendiente</span><strong>{formatMinor(balance?.pendingMinor)}</strong><small>Se libera al completar la entrega</small></article>
        <article className={[styles.affiliateStat, styles.affiliateStatHighlight].join(' ')}><span>Disponible</span><strong>{formatMinor(balance?.availableMinor)}</strong><small>Podés solicitarlo ahora</small></article>
        <article className={styles.affiliateStat}><span>Reservado</span><strong>{formatMinor(balance?.reservedMinor)}</strong><small>Retiros en proceso</small></article>
        <article className={styles.affiliateStat}><span>Pagado</span><strong>{formatMinor(balance?.paidMinor)}</strong><small>Retiros confirmados</small></article>
      </section>

      <section className={[styles.affiliatePanel, styles.affiliatePayoutLauncher].filter(Boolean).join(' ')}>
        <div className={styles.affiliatePanelHeading}>
          <div className={styles.affiliatePanelHeadingCopy}>
            <span className={`${styles.affiliatePanelIcon} ${styles.affiliatePanelIconAccent}`} aria-hidden="true"><WalletCards size={18} /></span>
            <div><p className="eyebrow">Retiro</p><h2>Solicitar saldo disponible</h2><p className={styles.affiliateMuted}>Abrí el formulario cuando quieras enviar una solicitud a administración.</p></div>
          </div>
          {canRequestPayout ? <Button type="button" onClick={() => setPayoutModalOpen(true)}>Solicitar retiro</Button> : null}
        </div>
        {canRequestPayout ? <p className="form-hint">Saldo disponible para retirar: <strong>{formatMinor(balance?.availableMinor)}</strong></p> : <p className="form-hint">La cuenta está suspendida: los retiros están temporalmente bloqueados.</p>}
      </section>

      <section className={[styles.affiliatePanel, styles.affiliateBalanceHistory].filter(Boolean).join(' ')}>
        <div className={styles.affiliatePanelHeading}><div className={styles.affiliatePanelHeadingCopy}><span className={styles.affiliatePanelIcon} aria-hidden="true"><ClipboardList size={18} /></span><div><p className="eyebrow">Historial financiero</p><h2>Actividad de saldo</h2></div></div></div>
        <div className={styles.affiliateBalanceTabs} role="tablist" aria-label="Historial financiero">
          <button id="affiliate-balance-entries-tab" type="button" role="tab" aria-selected={historyTab === 'entries'} aria-controls="affiliate-balance-entries" className={`${styles.affiliateBalanceTab} ${historyTab === 'entries' ? styles.isActive : ''}`} onClick={() => setHistoryTab('entries')}>Movimientos<span>{entries.length}</span></button>
          <button id="affiliate-balance-payouts-tab" type="button" role="tab" aria-selected={historyTab === 'payouts'} aria-controls="affiliate-balance-payouts" className={`${styles.affiliateBalanceTab} ${historyTab === 'payouts' ? styles.isActive : ''}`} onClick={() => setHistoryTab('payouts')}>Retiros{payoutHistory.data ? <span>{payoutHistory.data.total}</span> : null}</button>
        </div>
        {historyTab === 'entries' ? <div id="affiliate-balance-entries" role="tabpanel" aria-labelledby="affiliate-balance-entries-tab" className={styles.affiliateBalanceTabpanel}>
          {!entries.length ? <div className={styles.affiliateEmpty}><WalletCards size={28} /><p>Todavía no hay movimientos.</p><span>Cuando se acrediten ventas o retiros, van a aparecer acá.</span></div> : <div className={styles.affiliateLedgerList}>{entries.map((entry) => <div className={styles.affiliateLedgerRow} key={entry.id}><div><strong>{entry.type.replaceAll('_', ' ')}</strong><span>{formatDate(entry.createdAt)}</span></div><strong className={BigInt(entry.amountMinor) >= 0n ? styles.affiliateMoneyPositive : styles.affiliateMoneyNegative}>{BigInt(entry.amountMinor) >= 0n ? '+' : ''}{formatMinor(entry.amountMinor)}</strong></div>)}</div>}
        </div> : <div id="affiliate-balance-payouts" role="tabpanel" aria-labelledby="affiliate-balance-payouts-tab" className={styles.affiliateBalanceTabpanel}>
          {payoutHistory.isLoading ? <AffiliateLoading /> : payoutHistory.isError ? <AffiliateQueryError message={dataError(payoutHistory.error)} /> : !payoutHistory.data?.items.length ? <div className={styles.affiliateEmpty}><WalletCards size={28} /><p>Todavía no hay retiros.</p><span>Pedí un retiro cuando tengas saldo disponible.</span></div> : <><div className={styles.affiliateLedgerList}>{payoutHistory.data.items.map((item) => <div className={styles.affiliateLedgerRow} key={item.id}><div><strong>{item.status.replaceAll('_', ' ')}</strong><span>{formatDate(item.createdAt)} · Cuenta terminada en {item.destinationLast4 ?? '—'}</span></div><strong>{formatMinor(item.amountMinor)}</strong></div>)}</div><div className={styles.affiliatePagination} aria-label="Paginación de retiros"><Button variant="ghost" onClick={() => setPayoutPage((page) => Math.max(1, page - 1))} disabled={payoutPage === 1}>Anterior</Button><span>Página {payoutPage} de {payoutHistory.data.totalPages}</span><Button variant="ghost" onClick={() => setPayoutPage((page) => page + 1)} disabled={payoutPage >= payoutHistory.data.totalPages}>Siguiente</Button></div></>}
        </div>}
      </section>
    </>}
    {payoutModalOpen && canRequestPayout ? <div className={styles.affiliateModalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !payout.isPending) setPayoutModalOpen(false); }}>
      <div className={styles.affiliateModal} role="dialog" aria-modal="true" aria-labelledby="affiliate-payout-title" aria-describedby="affiliate-payout-description">
        <div className={styles.affiliateModalHeader}><div><p className="eyebrow">Retiro</p><h2 id="affiliate-payout-title">Solicitar retiro</h2></div><button type="button" className={styles.affiliateModalClose} aria-label="Cerrar solicitud de retiro" onClick={() => setPayoutModalOpen(false)} disabled={payout.isPending}><X size={18} /></button></div>
        <p id="affiliate-payout-description" className={styles.affiliateModalDescription}>Indicá cuánto querés retirar. El importe se guarda en centavos y no puede superar tu saldo disponible.</p>
        <div className={styles.affiliateModalBalance}><span>Saldo disponible</span><strong>{formatMinor(balance?.availableMinor)}</strong></div>
        <form className={[styles.affiliatePayoutForm, styles.affiliatePayoutModalForm].filter(Boolean).join(' ')} onSubmit={submitPayout}><label>Importe en USD<input autoFocus type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" required /></label><div className={styles.affiliateModalActions}><Button type="button" variant="ghost" onClick={() => setPayoutModalOpen(false)} disabled={payout.isPending}>Cancelar</Button><Button type="submit" disabled={payout.isPending || !amount}>{payout.isPending ? 'Enviando…' : 'Solicitar retiro'}</Button></div></form>
      </div>
    </div> : null}
  </>;
}

function AffiliateLogisticsView({ query, onRefresh }: { query: QueryResult<AffiliateLogistics>; onRefresh: () => void }) {
  const [zoneName, setZoneName] = useState(''); const [provinces, setProvinces] = useState(''); const [rateZoneId, setRateZoneId] = useState(''); const [rateName, setRateName] = useState(''); const [ratePrice, setRatePrice] = useState(''); const [pickupName, setPickupName] = useState(''); const [pickupAddress, setPickupAddress] = useState('');
  const createZone = useMutation({ mutationFn: createAffiliateShippingZone, onSuccess: () => { toast.success('Zona creada'); setZoneName(''); setProvinces(''); onRefresh(); }, onError: (error) => toast.error(dataError(error)) });
  const createRate = useMutation({ mutationFn: ({ zoneId, name, priceMinor }: { zoneId: string; name: string; priceMinor: string }) => createAffiliateShippingRate(zoneId, { name, priceMinor }), onSuccess: () => { toast.success('Tarifa creada'); setRateName(''); setRatePrice(''); onRefresh(); }, onError: (error) => toast.error(dataError(error)) });
  const createPickup = useMutation({ mutationFn: createAffiliatePickupPoint, onSuccess: () => { toast.success('Punto de retiro creado'); setPickupName(''); setPickupAddress(''); onRefresh(); }, onError: (error) => toast.error(dataError(error)) });
  const logistics = query.data;
  return <><AffiliateHeader eyebrow="Operación comercial" title="Logística" description="Cada publicación necesita al menos una opción de entrega activa antes de poder enviarse a revisión." action={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>Actualizar</Button>} />{query.isLoading ? <AffiliateLoading /> : query.isError ? <AffiliateQueryError message={dataError(query.error)} /> : <><div className={styles.affiliateLogisticsLayout}><section className={styles.affiliatePanel}><div className={styles.affiliatePanelHeading}><div className={styles.affiliatePanelHeadingCopy}><span className={styles.affiliatePanelIcon} aria-hidden="true"><Truck size={18} /></span><div><p className="eyebrow">Envíos</p><h2>Zonas y tarifas</h2></div></div></div>{!logistics?.zones.length ? <div className={styles.affiliateEmpty}><Truck size={28} /><p>Sin zonas de envío</p><span>Creá al menos una zona con tarifas para habilitar entregas.</span></div> : <div className={styles.affiliateLogisticsList}>{logistics.zones.map((zone) => <article className={styles.affiliateLogisticsCard} key={zone.id}><div><strong>{zone.name}</strong><span>{zone.provinces.map((province) => province.province).join(' · ')}</span></div>{zone.rates.length ? <ul>{zone.rates.map((rate) => <li key={rate.id}><span>{rate.name}</span><strong>{formatMinor(rate.priceMinor)}</strong></li>)}</ul> : <p className={styles.affiliateMuted}>Sin tarifas. Agregá una para habilitar envíos.</p>}</article>)}</div>}</section><section className={styles.affiliatePanel}><div className={styles.affiliatePanelHeading}><div className={styles.affiliatePanelHeadingCopy}><span className={`${styles.affiliatePanelIcon} ${styles.affiliatePanelIconAccent}`} aria-hidden="true"><Plus size={18} /></span><div><p className="eyebrow">Nueva configuración</p><h2>Agregar envío</h2></div></div></div><form className={styles.affiliateCompactForm} onSubmit={(event) => { event.preventDefault(); const parsed = provinces.split(/[,;\n]/).map((province) => province.trim()).filter(Boolean); if (parsed.length === 0) return toast.error('Indicá al menos una provincia'); createZone.mutate({ name: zoneName.trim(), provinces: parsed }); }}><label>Nombre de zona<input value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="CABA y GBA" required /></label><label>Provincias<input value={provinces} onChange={(event) => setProvinces(event.target.value)} placeholder="CABA, Buenos Aires" required /><small>Separalas con coma.</small></label><Button type="submit" disabled={createZone.isPending}>{createZone.isPending ? 'Guardando…' : 'Crear zona'}</Button></form>{logistics?.zones.length ? <form className={[styles.affiliateCompactForm, styles.affiliateFormDivider].filter(Boolean).join(' ')} onSubmit={(event) => { event.preventDefault(); const parsed = parseMinor(ratePrice); if (!rateZoneId || !parsed || !rateName.trim()) return toast.error('Completá zona, nombre y precio'); createRate.mutate({ zoneId: rateZoneId, name: rateName.trim(), priceMinor: parsed }); }}><label>Zona<select value={rateZoneId} onChange={(event) => setRateZoneId(event.target.value)}><option value="">Elegí una zona</option>{logistics.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label><label>Nombre de tarifa<input value={rateName} onChange={(event) => setRateName(event.target.value)} placeholder="Envío estándar" required /></label><label>Precio en USD<input type="number" min="0" step="0.01" value={ratePrice} onChange={(event) => setRatePrice(event.target.value)} placeholder="5,00" required /></label><Button type="submit" disabled={createRate.isPending}>{createRate.isPending ? 'Guardando…' : 'Agregar tarifa'}</Button></form> : null}</section></div><section className={styles.affiliatePanel}><div className={styles.affiliatePanelHeading}><div className={styles.affiliatePanelHeadingCopy}><span className={styles.affiliatePanelIcon} aria-hidden="true"><MapPin size={18} /></span><div><p className="eyebrow">Retiro</p><h2>Puntos de retiro</h2></div></div></div>{logistics?.pickupPoints.length ? <div className={styles.affiliatePickupList}>{logistics.pickupPoints.map((point) => <div key={point.id}><MapPin size={17} /><div><strong>{point.name}</strong><span>{point.address}</span></div></div>)}</div> : <div className={styles.affiliateEmpty}><MapPin size={28} /><p>Sin puntos de retiro</p><span>Agregá una dirección si ofrecés retiro en persona.</span></div>}<form className={styles.affiliateInlineGrid} onSubmit={(event) => { event.preventDefault(); createPickup.mutate({ name: pickupName.trim(), address: pickupAddress.trim() }); }}><label>Nombre<input value={pickupName} onChange={(event) => setPickupName(event.target.value)} placeholder="Local de Palermo" required /></label><label>Dirección<input value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} placeholder="Av. Santa Fe 1234" required /></label><Button type="submit" disabled={createPickup.isPending}>{createPickup.isPending ? 'Guardando…' : 'Agregar punto'}</Button></form></section></>}</>;
}

function AffiliateSettingsView({ profile }: { profile: AffiliateProfile }) {
  const queryClient = useQueryClient(); const [publicName, setPublicName] = useState(profile.publicName); const [contactPhone, setContactPhone] = useState(profile.contactPhone ?? ''); const [payoutAccount, setPayoutAccount] = useState('');
  const update = useMutation({ mutationFn: updateAffiliateProfile, onSuccess: () => { toast.success('Configuración guardada'); void queryClient.invalidateQueries({ queryKey: ['affiliate'] }); }, onError: (error) => toast.error(dataError(error)) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const input: Record<string, unknown> = { expectedVersion: profile.version, publicName: publicName.trim(), contactPhone: contactPhone.trim() || null }; if (payoutAccount.trim()) input.payoutAccount = payoutAccount.trim(); update.mutate(input); }
  return <><AffiliateHeader eyebrow="Cuenta del vendedor" title="Configuración" description="Actualizá cómo te ven los clientes y dónde recibir los retiros." /><section className={styles.affiliatePanel}><form className={styles.affiliateNewForm} onSubmit={submit}><label>Nombre público<input value={publicName} onChange={(event) => setPublicName(event.target.value)} maxLength={120} required /><small>Es el nombre que aparece en el catálogo y en las órdenes.</small></label><label>Teléfono de contacto<input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} maxLength={50} placeholder="Opcional" /></label><label>Cuenta para retiros<input value={payoutAccount} onChange={(event) => setPayoutAccount(event.target.value)} minLength={4} maxLength={500} placeholder={profile.payoutAccountLast4 ? `Dejar vacío para conservar la cuenta terminada en ${profile.payoutAccountLast4}` : 'CBU, alias o cuenta de pago'} /><small>Por seguridad nunca mostramos la cuenta completa. Si la dejás vacía, se conserva la actual.</small></label><div className={styles.affiliateFormFooter}><span>Versión de configuración: {profile.version}</span><Button type="submit" disabled={update.isPending}>{update.isPending ? 'Guardando…' : 'Guardar cambios'}</Button></div></form></section></>;
}

function AffiliateNewListing() {
  const router = useRouter(); const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [kind, setKind] = useState<ListingKind>('SEALED_PRODUCT'); const [price, setPrice] = useState(''); const [stock, setStock] = useState('1'); const [files, setFiles] = useState<File[]>([]);
  const create = useMutation({ mutationFn: async () => { const priceMinor = parseMinor(price); if (!priceMinor || priceMinor === '0') throw new Error('Ingresá un precio válido'); const quantity = Number(stock); if (!Number.isInteger(quantity) || quantity < 1) throw new Error('El stock debe ser de al menos una unidad'); const result = await createAffiliateListing({ name: name.trim(), description: description.trim(), kind, stockMode: 'QUANTITY', priceMinor, stock: quantity }); if (files.length) await uploadAffiliateImages(result.id, 1, files); return result; }, onSuccess: (result) => { toast.success('Borrador creado'); router.push(`/affiliate/listings/${result.id}`); }, onError: (error) => toast.error(dataError(error)) });
  return <><AffiliateHeader eyebrow="Nueva publicación" title="Crear producto" description="Guardá un borrador, completá la logística y luego envialo a revisión." action={<Link className="button button-secondary" href="/affiliate/listings"><ArrowLeft size={16} />Volver</Link>} /><section className={styles.affiliatePanel}><form className={styles.affiliateNewForm} onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} maxLength={180} placeholder="Ej. Booster sellado" required /></label><label>Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={5} placeholder="Contale al comprador qué está ofreciendo…" /></label><div className={styles.affiliateFormGrid}><label>Tipo<select value={kind} onChange={(event) => setKind(event.target.value as ListingKind)}><option value="SEALED_PRODUCT">Producto sellado</option><option value="ACCESSORY">Accesorio</option></select></label><label>Precio en USD<input type="number" min="0.01" step="0.01" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0,00" required /></label><label>Stock<input type="number" min="1" step="1" inputMode="numeric" value={stock} onChange={(event) => setStock(event.target.value)} required /></label></div><label>Imágenes (hasta 8)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 8))} /><small>{files.length ? `${files.length} imagen${files.length === 1 ? '' : 'es'} seleccionada${files.length === 1 ? '' : 's'}` : 'Una buena foto es obligatoria para enviar a revisión.'}</small></label><p className="form-hint">Las publicaciones nuevas comienzan como borrador. Para enviarlas a revisión necesitás imagen, stock positivo y al menos una opción de entrega activa.</p><div className={styles.affiliateFormFooter}><Link className="button button-ghost" href="/affiliate">Cancelar</Link><Button type="submit" disabled={create.isPending || !name.trim() || !price}>{create.isPending ? 'Guardando…' : 'Guardar borrador'}</Button></div></form></section></>;
}

function AffiliateListingEditor({ listing, onSaved }: { listing: AffiliateListing; onSaved: () => void }) {
  const router = useRouter(); const queryClient = useQueryClient(); const [returning, setReturning] = useState(false); const [name, setName] = useState(listing.product.name); const [description, setDescription] = useState(listing.product.description); const [price, setPrice] = useState(minorInput(listing.product.priceMinor)); const [stock, setStock] = useState(String(listing.product.inventory?.onHand ?? 0)); const [files, setFiles] = useState<File[]>([]);
  const save = useMutation({ mutationFn: () => { const priceMinor = parseMinor(price); if (!priceMinor || priceMinor === '0') throw new Error('Ingresá un precio válido'); const quantity = Number(stock); if (!Number.isInteger(quantity) || quantity < 0) throw new Error('El stock no es válido'); return updateAffiliateListing(listing.id, { expectedVersion: listing.product.version, name: name.trim(), description: description.trim(), priceMinor, stock: quantity }); }, onSuccess: (result) => { const quantity = Number(stock); queryClient.setQueryData<AffiliateListing[]>(['affiliate', 'listings'], (current) => current?.map((row) => { if (row.id !== listing.id) return row; const inventory = row.product.inventory ? { ...row.product.inventory, onHand: quantity, available: Math.max(0, quantity - row.product.inventory.reserved), version: row.product.inventory.version + 1 } : row.product.inventory; return { ...row, status: result.status, reviewNote: null, submittedAt: result.status === 'PENDING_REVIEW' ? new Date().toISOString() : null, reviewedAt: null, product: { ...row.product, name: name.trim(), description: description.trim(), priceMinor: parseMinor(price) ?? row.product.priceMinor, status: 'DRAFT', version: result.version, inventory } }; })); toast.success(result.status === 'PENDING_REVIEW' ? 'Cambios guardados y enviados a revisión.' : 'Cambios guardados. La publicación volvió a borrador para revisión.'); void onSaved(); }, onError: (error) => toast.error(dataError(error)) });
  const upload = useMutation({ mutationFn: () => uploadAffiliateImages(listing.id, listing.product.version, files), onSuccess: () => { toast.success('Imágenes agregadas'); setFiles([]); onSaved(); }, onError: (error) => toast.error(dataError(error)) });
  const remove = useMutation({ mutationFn: (imageId: string) => deleteAffiliateImage(listing.id, imageId, listing.product.version), onSuccess: () => { toast.success('Imagen retirada'); onSaved(); }, onError: (error) => toast.error(dataError(error)) });
  const busy = save.isPending || upload.isPending || remove.isPending;
  async function goBack() { if (returning) return; setReturning(true); await queryClient.invalidateQueries({ queryKey: ['affiliate', 'listings'] }).catch(() => undefined); router.push('/affiliate/listings'); }
  return <><AffiliateHeader eyebrow="Editar publicación" title={listing.product.name} description={`Estado actual: ${listingStatusLabel(listing.status)} · Versión ${listing.product.version}`} action={<Button variant="secondary" onClick={() => void goBack()} disabled={busy || returning}><ArrowLeft size={16} />{returning ? 'Cargando…' : 'Volver'}</Button>} /><section className={styles.affiliatePanel}><form className={styles.affiliateNewForm} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} maxLength={180} required /></label><label>Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={6} /></label><div className={styles.affiliateFormGrid}><label>Precio en USD<input type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></label><label>Stock<input type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} required /></label></div><div className={styles.affiliateFormFooter}><span>Editar precio, stock o contenido obliga a una nueva revisión.</span><Button type="submit" disabled={busy}>{save.isPending ? 'Guardando…' : 'Guardar cambios'}</Button></div></form></section><section className={styles.affiliatePanel}><div className={styles.affiliatePanelHeading}><div><p className="eyebrow">Multimedia</p><h2>Imágenes</h2></div><span>{listing.product.images.length}/8</span></div>{listing.product.images.length ? <div className={styles.affiliateImageGrid}>{listing.product.images.map((image) => <div className={styles.affiliateImageCard} key={image.id}><Image src={image.url} alt={image.altText ?? listing.product.name} width={120} height={140} unoptimized /><button type="button" onClick={() => remove.mutate(image.id)} disabled={busy} aria-label={`Retirar imagen de ${listing.product.name}`}><Trash2 size={15} /></button></div>)}</div> : <p className={styles.affiliateMuted}>Todavía no hay imágenes.</p>}{listing.product.images.length < 8 && <div className={styles.affiliateUploadRow}><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 8 - listing.product.images.length))} /><Button type="button" variant="secondary" onClick={() => upload.mutate()} disabled={busy || !files.length}><ImagePlus size={16} />Agregar imágenes</Button></div>}</section></>;
}
