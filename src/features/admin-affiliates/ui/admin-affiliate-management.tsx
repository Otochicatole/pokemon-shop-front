'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Check, Eye, RefreshCw, Search, UserPlus, UserRound, X } from 'lucide-react';
import { toast } from '@/components/feedback';
import { AdminPageHeader, AdminTabPanel, AdminTabs, Button, Dialog, TextareaField, TextField } from '@/components';
import type { AdminCustomer } from '@/features/customer-management/domain/contracts';
import { listAdminCustomers } from '@/features/customer-management/infrastructure/api';
import { adminFetch, adminErrorMessage } from '@/shared/admin/client';
import { AffiliateAdminNavigation } from './affiliate-admin-navigation';
import styles from './admin-affiliate-management.module.css';

import shared from '@/components/admin/admin-shared.module.css';
type AffiliateAdminTab = 'affiliates' | 'listings';
type AffiliateRow = { id: string; publicName: string; status: 'ACTIVE' | 'SUSPENDED'; version: number; user?: { id: string; email: string; name: string | null }; counts?: { listings: number; sellerOrders: number } };
type PendingListing = {
  id: string;
  status: string;
  reviewNote?: string | null;
  affiliate?: { publicName: string };
  product: {
    id: string;
    name: string;
    description: string;
    kind: 'SINGLE_CARD' | 'SEALED_PRODUCT' | 'ACCESSORY';
    priceMinor: string;
    version: number;
    images: Array<{ id: string; url: string; altText: string | null; sortOrder: number }>;
    inventory?: { available: number } | null;
  };
};
type ReviewTarget = { id: string; version: number; decision: 'APPROVED' | 'CHANGES_REQUESTED' };

function unwrap<T>(value: unknown): T { return value && typeof value === 'object' && 'data' in value ? (value as { data: T }).data : value as T; }
async function getAffiliates() { const payload = unwrap<AffiliateRow[] | { items: AffiliateRow[] }>(await adminFetch('/admin/affiliates')); return Array.isArray(payload) ? payload : payload.items; }
async function getPendingListings() { const payload = unwrap<PendingListing[] | { items: PendingListing[] }>(await adminFetch('/admin/affiliates/listings?status=PENDING_REVIEW')); return Array.isArray(payload) ? payload : payload.items; }
function formatPrice(priceMinor: string) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(BigInt(priceMinor)) / 100); }
function listingKindLabel(kind: PendingListing['product']['kind']) { return ({ SINGLE_CARD: 'Carta suelta', SEALED_PRODUCT: 'Producto sellado', ACCESSORY: 'Accesorio' })[kind]; }

export function AdminAffiliateManagement() {
  const client = useQueryClient();
  const [tab, setTab] = useState<AffiliateAdminTab>('affiliates');
  const [createOpen, setCreateOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminCustomer | null>(null);
  const [publicName, setPublicName] = useState('');
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [previewTarget, setPreviewTarget] = useState<PendingListing | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);

  const affiliates = useQuery({ queryKey: ['admin', 'affiliates'], queryFn: getAffiliates });
  const listings = useQuery({ queryKey: ['admin', 'affiliate-listings'], queryFn: getPendingListings });
  const userSearchQuery = useQuery({ queryKey: ['admin', 'affiliate-user-search', userSearch.trim()], queryFn: () => listAdminCustomers({ search: userSearch.trim(), status: 'ACTIVE', limit: 8 }), enabled: false, staleTime: 30_000, retry: false });
  const rows = affiliates.data ?? [];
  const pending = listings.data ?? [];
  const availableUsers = userSearchQuery.data?.data.filter((user) => !rows.some((row) => row.user?.id === user.id)) ?? [];
  const create = useMutation({
    mutationFn: () => { if (!selectedUser) throw new Error('Seleccioná un usuario'); return adminFetch('/admin/affiliates', { method: 'POST', body: JSON.stringify({ userId: selectedUser.id, publicName: publicName.trim() }) }); },
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['admin', 'affiliates'] }); toast.success('Afiliado creado'); resetCreate(); },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const review = useMutation({
    mutationFn: ({ id, decision, version, note }: ReviewTarget & { note?: string }) => adminFetch(`/admin/affiliates/listings/${id}/review`, { method: 'POST', body: JSON.stringify({ decision, expectedVersion: version, ...(note ? { note } : {}) }) }),
    onSuccess: async (_result, variables) => {
      // La cola solo contiene publicaciones pendientes: retirarla de inmediato
      // evita que se pueda volver a aprobar una fila ya procesada mientras se
      // completa la invalidación/refetch.
      client.setQueryData<PendingListing[]>(['admin', 'affiliate-listings'], (current) => current?.filter((row) => row.id !== variables.id));
      await client.invalidateQueries({ queryKey: ['admin', 'affiliate-listings'] });
      toast.success('Revisión actualizada');
      resetReview();
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, status, version }: { id: string; status: 'ACTIVE' | 'SUSPENDED'; version: number }) => adminFetch(`/admin/affiliates/${id}`, { method: 'PATCH', body: JSON.stringify({ status, expectedVersion: version }) }),
    onSuccess: () => { toast.success('Estado del afiliado actualizado'); void client.invalidateQueries({ queryKey: ['admin', 'affiliates'] }); },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const busy = create.isPending || review.isPending || changeStatus.isPending;

  function openCreate() { setUserSearch(''); setSelectedUser(null); setPublicName(''); setCreateOpen(true); }
  function resetCreate() { setCreateOpen(false); setUserSearch(''); setSelectedUser(null); setPublicName(''); }
  function closeCreate() { if (!create.isPending) resetCreate(); }
  function searchUsers() { if (userSearch.trim().length < 2) { toast.error('Ingresá al menos 2 caracteres para buscar'); return; } void userSearchQuery.refetch(); }
  function resetReview() { setReviewTarget(null); setReviewNote(''); }
  function closeReview() { if (!review.isPending) { setReviewTarget(null); setReviewNote(''); } }
  function openPreview(listing: PendingListing) { setPreviewTarget(listing); setPreviewImageId(listing.product.images[0]?.id ?? null); }
  function closePreview() { setPreviewTarget(null); setPreviewImageId(null); }
  function refresh() { void Promise.all([affiliates.refetch(), listings.refetch()]); }

  return <>
    <AdminPageHeader
      eyebrow="Marketplace"
      title="Afiliados"
      description="Habilitá vendedores existentes y administrá publicaciones, ventas, incidencias y retiros desde el menú lateral."
      actions={<><Button variant="secondary" onClick={refresh} disabled={affiliates.isFetching || listings.isFetching}><RefreshCw size={16} />Actualizar</Button><Button onClick={openCreate}><UserPlus size={16} />Agregar afiliado</Button></>}
    />
    <div className={styles.affiliateAdminLayout}>
      <AffiliateAdminNavigation active="overview" />
      <div className={styles.affiliateAdminContent}>
        <AdminTabs
          id="affiliate-tabs"
          label="Gestión de afiliados"
          active={tab}
          onChange={(value) => setTab(value as AffiliateAdminTab)}
          tabs={[
            { id: 'affiliates', label: 'Afiliados', count: rows.length },
            { id: 'listings', label: 'Publicaciones', count: pending.length },
          ]}
        />

        <AdminTabPanel tabsId="affiliate-tabs" tabId="affiliates" active={tab === 'affiliates'} className={shared.adminTabsContent}>
          <section className={[shared.adminPanel, styles.affiliateAdminDirectory].filter(Boolean).join(' ')}>
            <div className={shared.adminPanelHeader}>
              <div>
                <span className={shared.adminPanelKicker}>Vendedores habilitados</span>
                <h2>Lista de afiliados</h2>
              </div>
              <span className={shared.adminCountBadge}>{rows.length}</span>
            </div>
            {affiliates.isLoading ? (
              <div className={shared.adminLoading}>Cargando afiliados</div>
            ) : affiliates.isError ? (
              <div className={styles.affiliateAdminInlineError} role="alert">{adminErrorMessage(affiliates.error)}</div>
            ) : (
              <div className={shared.adminPanelBody}>
                {rows.length ? (
                  <ul className={[shared.adminList, styles.affiliateAdminDirectoryList].filter(Boolean).join(' ')}>
                    {rows.map((row) => (
                      <li key={row.id}>
                        <div className={[shared.adminListRow, styles.affiliateAdminRow].filter(Boolean).join(' ')}>
                          <div>
                            <strong>{row.publicName}</strong>
                            <span>{row.user?.name ? `${row.user.name} · ` : ''}{row.user?.email ?? row.id}</span>
                            <small>{row.counts?.listings ?? 0} publicaciones · {row.counts?.sellerOrders ?? 0} ventas</small>
                          </div>
                          <div className={shared.adminRowActions}>
                            <span className={`${shared.adminBadge} ${row.status === 'ACTIVE'? shared.adminBadgeGreen : shared.adminBadgeRed}`}>{row.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}</span>
                            <Button variant="ghost" onClick={() => changeStatus.mutate({ id: row.id, status: row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE', version: row.version })} disabled={busy}>
                              {row.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={shared.adminEmptyCopy}>No hay afiliados registrados.</p>
                )}
              </div>
            )}
          </section>
        </AdminTabPanel>

        <AdminTabPanel tabsId="affiliate-tabs" tabId="listings" active={tab === 'listings'} className={shared.adminTabsContent}>
          <section className={[shared.adminPanel, styles.affiliateAdminPublications].filter(Boolean).join(' ')}>
            <div className={shared.adminPanelHeader}>
              <div>
                <span className={shared.adminPanelKicker}>Control editorial</span>
                <h2>Publicaciones pendientes</h2>
              </div>
              <span className={shared.adminCountBadge}>{pending.length}</span>
            </div>
            {listings.isLoading ? (
              <div className={shared.adminLoading}>Cargando publicaciones</div>
            ) : listings.isError ? (
              <div className={styles.affiliateAdminInlineError} role="alert">{adminErrorMessage(listings.error)}</div>
            ) : (
              <div className={shared.adminPanelBody}>
                {pending.length ? (
                  <ul className={[shared.adminList, styles.affiliateAdminPublicationsList].filter(Boolean).join(' ')}>
                    {pending.map((row) => (
                      <li key={row.id}>
                        <div className={[shared.adminListRow, styles.affiliateAdminRow].filter(Boolean).join(' ')}>
                          <div>
                            <button type="button" className={styles.affiliateAdminPublicationName} onClick={() => openPreview(row)}>
                              <strong>{row.product.name}</strong>
                              <span>{row.affiliate?.publicName ?? 'Afiliado'} · Stock disponible {row.product.inventory?.available ?? 0} · {row.product.images.length} imágenes</span>
                            </button>
                          </div>
                          <div className={shared.adminRowActions}>
                            <Button variant="ghost" onClick={() => openPreview(row)} disabled={busy}><Eye size={15} />Vista previa</Button>
                            <Button variant="secondary" onClick={() => review.mutate({ id: row.id, version: row.product.version, decision: 'APPROVED' })} disabled={busy}><Check size={15} />Aprobar</Button>
                            <Button variant="ghost" onClick={() => { setReviewNote(''); setReviewTarget({ id: row.id, version: row.product.version, decision: 'CHANGES_REQUESTED' }); }} disabled={busy}><X size={15} />Pedir cambios</Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={shared.adminEmptyCopy}>No hay publicaciones esperando revisión.</p>
                )}
              </div>
            )}
          </section>
        </AdminTabPanel>
      </div>
    </div>

    <Dialog open={Boolean(previewTarget)} title={previewTarget ? `Preview · ${previewTarget.product.name}` : 'Preview de publicación'} description="Revisá cómo se presenta el artículo antes de aprobarlo." onClose={closePreview} className={[shared.adminWideDialog, styles.affiliateAdminPreviewDialog].filter(Boolean).join(' ')}>
      {previewTarget && <>
        <div className={styles.affiliateAdminPreview}>
          <div className={styles.affiliateAdminPreviewMedia}>
            <div className={styles.affiliateAdminPreviewImage}>{previewTarget.product.images.find((image) => image.id === previewImageId) ? <Image src={previewTarget.product.images.find((image) => image.id === previewImageId)!.url} alt={previewTarget.product.images.find((image) => image.id === previewImageId)!.altText ?? previewTarget.product.name} width={560} height={560} unoptimized /> : <span>Sin imágenes</span>}</div>
            {previewTarget.product.images.length > 1 && <div className={styles.affiliateAdminPreviewThumbnails} aria-label="Imágenes de la publicación">{previewTarget.product.images.map((image) => <button key={image.id} type="button" className={image.id === previewImageId? styles.isActive : ''} onClick={() => setPreviewImageId(image.id)} aria-label={`Ver imagen ${image.sortOrder + 1}`}><Image src={image.url} alt={image.altText ?? ''} width={72} height={72} unoptimized /></button>)}</div>}
          </div>
          <div className={styles.affiliateAdminPreviewDetails}>
            <div><span className={shared.adminPanelKicker}>Publicación pendiente de revisión</span><h3>{previewTarget.product.name}</h3><p className={styles.affiliateAdminPreviewSeller}>Vende {previewTarget.affiliate?.publicName ?? 'Afiliado'}</p></div>
            <dl className={styles.affiliateAdminPreviewData}><div><dt>Tipo</dt><dd>{listingKindLabel(previewTarget.product.kind)}</dd></div><div><dt>Precio</dt><dd className={styles.affiliateAdminPreviewPrice}>{formatPrice(previewTarget.product.priceMinor)}</dd></div><div><dt>Stock disponible</dt><dd>{previewTarget.product.inventory?.available ?? 0} unidades</dd></div><div><dt>Imágenes</dt><dd>{previewTarget.product.images.length}</dd></div></dl>
            <div className={styles.affiliateAdminPreviewDescription}><span className={shared.adminPanelKicker}>Descripción</span><p>{previewTarget.product.description.trim() || 'El afiliado no agregó una descripción.'}</p></div>
          </div>
        </div>
        <div className={shared.adminDialogActions}><Button type="button" variant="secondary" onClick={closePreview}>Cerrar preview</Button></div>
      </>}
    </Dialog>

    <Dialog open={createOpen} title="Agregar afiliado" description="Habilitá como vendedor a un usuario existente y definí el nombre que verá la tienda." onClose={closeCreate} className={shared.adminConfirmDialog}>
      <form className={shared.adminDialogForm} onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        {selectedUser ? <div className={styles.affiliateAdminSelectedUser}><UserRound size={19} aria-hidden="true" /><div><strong>{selectedUser.name?.trim() || 'Cliente sin nombre'}</strong><span>{selectedUser.email}</span><small>ID: {selectedUser.id}</small></div><button type="button" className={styles.affiliateAdminUserChange} onClick={() => { setSelectedUser(null); setUserSearch(''); setPublicName(''); }}>Cambiar</button></div> : <>
          <div className={styles.affiliateAdminUserSearch}><TextField label="Buscar usuario" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Nombre o email" autoComplete="off" autoFocus /><Button type="button" variant="secondary" onClick={searchUsers} disabled={userSearchQuery.isFetching || userSearch.trim().length < 2}><Search size={16} />{userSearchQuery.isFetching ? 'Buscando…' : 'Buscar'}</Button></div>
          {userSearchQuery.isError && <p className="form-error" role="alert">{adminErrorMessage(userSearchQuery.error)}</p>}
          {userSearchQuery.isFetching && <p className={styles.affiliateAdminSearchState}>Buscando usuarios activos…</p>}
          {!userSearchQuery.isFetching && userSearchQuery.isFetched && availableUsers.length === 0 && <p className={styles.affiliateAdminSearchState}>No encontramos usuarios activos disponibles.</p>}
          {Boolean(availableUsers.length) && <ul className={styles.affiliateAdminUserResults} aria-label="Resultados de usuarios">{availableUsers.map((result) => <li key={result.id}><button type="button" onClick={() => { setSelectedUser(result); setPublicName(result.name?.trim() || ''); }}><UserRound size={17} aria-hidden="true" /><span><strong>{result.name?.trim() || 'Cliente sin nombre'}</strong><small>{result.email}</small></span></button></li>)}</ul>}
          <p className="form-hint">Buscá por nombre o email. Solo se muestran usuarios activos y la consulta se ejecuta al presionar “Buscar”.</p>
        </>}
        <TextField label="Nombre público" value={publicName} onChange={(event) => setPublicName(event.target.value)} placeholder="Nombre visible en la tienda" disabled={!selectedUser} required hint={selectedUser ? 'Es el nombre que verá el cliente en la tienda.' : 'Primero seleccioná un usuario.'} />
        <div className={shared.adminDialogActions}><Button type="button" variant="secondary" onClick={closeCreate} disabled={create.isPending}>Cancelar</Button><Button type="submit" disabled={create.isPending || !selectedUser || !publicName.trim()}><UserPlus size={16} />{create.isPending ? 'Habilitando…' : 'Habilitar afiliado'}</Button></div>
      </form>
    </Dialog>

    <Dialog open={Boolean(reviewTarget)} title="Pedir cambios" description="Dejá una indicación concreta para que el afiliado pueda corregir la publicación." onClose={closeReview}>
      <form className={shared.adminForm} onSubmit={(event) => { event.preventDefault(); if (!reviewTarget || reviewNote.trim().length < 3) return; review.mutate({ ...reviewTarget, note: reviewNote.trim() }); }}><TextareaField label="Motivo" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} minLength={3} maxLength={500} rows={5} placeholder="Ej. Agregá una foto del frente y aclarà el idioma del producto." required /><div className={shared.adminDialogActions}><Button type="button" variant="secondary" onClick={closeReview} disabled={review.isPending}>Cancelar</Button><Button type="submit" disabled={review.isPending || reviewNote.trim().length < 3}>{review.isPending ? 'Guardando…' : 'Solicitar cambios'}</Button></div></form>
    </Dialog>
  </>;
}
