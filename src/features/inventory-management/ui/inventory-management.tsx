'use client';
/* Product thumbnails may come from the media CDN. */
/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, History, PackagePlus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { AdminDataTable, AdminPageHeader, Button, CursorPagination, Dialog, SelectField, TextField, TextareaField } from '@/components';
import shared from '@/components/admin/admin-shared.module.css';
import { getAdminProduct } from '@/features/product-management/infrastructure/api';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge, adminLabel, adminMoney } from '@/shared/admin/format';
import type { InventoryProduct } from '../domain/contracts';
import { adjustInventory, getInventoryHistory, listInventory } from '../infrastructure/api';
import styles from './inventory-management.module.css';

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.detailRow}>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.detailSection}>
      <h4>{title}</h4>
      <dl className={styles.detailList}>{children}</dl>
    </section>
  );
}

export function InventoryManagementView({ initialStock = '' }: { initialStock?: string }) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', stock: initialStock });
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<Array<string | undefined>>([]);
  const [adjusting, setAdjusting] = useState<InventoryProduct | null>(null);
  const [historyProduct, setHistoryProduct] = useState<InventoryProduct | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [adjustmentCursor, setAdjustmentCursor] = useState<string>();
  const [adjustmentPages, setAdjustmentPages] = useState<Array<string | undefined>>([]);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

  const inventory = useQuery({
    queryKey: ['admin', 'inventory', filters, cursor],
    queryFn: () => listInventory({ ...filters, cursor, limit: 30 }),
    placeholderData: (previous) => previous,
  });
  const adjustments = useQuery({
    queryKey: ['admin', 'inventory-history', historyProduct?.id, adjustmentCursor],
    queryFn: () => getInventoryHistory(historyProduct!.id, adjustmentCursor),
    enabled: Boolean(historyProduct),
  });
  const viewing = useQuery({
    queryKey: ['admin', 'product', viewingId],
    queryFn: () => getAdminProduct(viewingId!),
    enabled: Boolean(viewingId),
  });
  const mutation = useMutation({
    mutationFn: () => adjustInventory(adjusting!.id, Number(delta), reason),
    onSuccess: async () => {
      toast.success('Stock ajustado y auditado');
      setAdjusting(null);
      setDelta('');
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setCursor(undefined);
    setHistory([]);
  };

  const card = viewing.data?.pokemonCard;
  const image = viewing.data?.images[0];

  return (
    <>
      <AdminPageHeader
        eyebrow="Control de existencias"
        title="Inventario"
        description="Stock físico, reservas activas y disponibilidad vendible. Todo cambio queda registrado con su motivo."
        actions={(
          <Button variant="secondary" onClick={() => void inventory.refetch()} disabled={inventory.isFetching}>
            <RefreshCw size={16} />
            Actualizar
          </Button>
        )}
      />

      <div className={shared.adminToolbar}>
        <TextField
          className={shared.adminSearchField}
          label="Buscar producto"
          value={filters.search}
          onChange={(event) => setFilter('search', event.target.value)}
          placeholder="SKU, nombre o slug"
        />
        <SelectField label="Disponibilidad" value={filters.stock} onChange={(event) => setFilter('stock', event.target.value)}>
          <option value="">Todos</option>
          <option value="AVAILABLE">Con stock</option>
          <option value="LOW">Stock bajo</option>
          <option value="OUT">Sin stock</option>
        </SelectField>
      </div>

      {inventory.isLoading ? (
        <div className={shared.adminLoading}>Cargando inventario</div>
      ) : inventory.isError ? (
        <div className={shared.adminErrorPanel}>
          <div>
            <h2>No pudimos cargar el inventario</h2>
            <p>{adminErrorMessage(inventory.error)}</p>
          </div>
        </div>
      ) : (
        <>
          <AdminDataTable
            rows={inventory.data?.data ?? []}
            rowKey={(row) => row.id}
            caption="Inventario de productos"
            columns={[
              {
                key: 'product',
                header: 'Producto',
                render: (row) => (
                  <div>
                    <Link className={shared.adminTableLink} href={`/admin/products/${row.id}`}>{row.name}</Link>
                    <small className={shared.adminBlockMuted}>{row.sku}</small>
                  </div>
                ),
              },
              { key: 'mode', header: 'Modo', render: (row) => <AdminBadge value={row.stockMode} /> },
              { key: 'onHand', header: 'Físico', align: 'center', render: (row) => <strong>{row.inventory.onHand}</strong> },
              { key: 'reserved', header: 'Reservado', align: 'center', render: (row) => <span>{row.inventory.reserved}</span> },
              {
                key: 'available',
                header: 'Disponible',
                align: 'center',
                render: (row) => (
                  <span className={row.inventory.available <= 0 ? shared.adminStockOut : row.inventory.available <= 5 ? shared.adminStockLow : shared.adminStockOk}>
                    {row.inventory.available}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Acciones',
                align: 'right',
                render: (row) => (
                  <div className={shared.adminTableActions}>
                    <button className={shared.adminIconButton} type="button" title="Ver detalle" onClick={() => setViewingId(row.id)} aria-label={`Ver detalle de ${row.name}`}>
                      <Eye size={17} />
                    </button>
                    <button
                      className={shared.adminIconButton}
                      type="button"
                      title="Historial"
                      onClick={() => { setHistoryProduct(row); setAdjustmentCursor(undefined); setAdjustmentPages([]); }}
                      aria-label={`Ver historial de ${row.name}`}
                    >
                      <History size={17} />
                    </button>
                    <button className={shared.adminIconButton} type="button" title="Ajustar stock" onClick={() => setAdjusting(row)} aria-label={`Ajustar stock de ${row.name}`}>
                      <PackagePlus size={17} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
          <CursorPagination
            canPrevious={history.length > 0}
            canNext={Boolean(inventory.data?.nextCursor)}
            loading={inventory.isFetching}
            onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }}
            onNext={() => {
              if (!inventory.data?.nextCursor) return;
              setHistory((current) => [...current, cursor]);
              setCursor(inventory.data.nextCursor ?? undefined);
            }}
          />
        </>
      )}

      <Dialog
        open={Boolean(viewingId)}
        onClose={() => setViewingId(null)}
        title="Detalle del producto"
        description={viewing.data ? `${viewing.data.sku} · ${adminLabel(viewing.data.status)}` : 'Cargando ficha del producto…'}
        className={styles.detailDialog}
      >
        {viewing.isLoading ? (
          <div className={styles.detailLoading} aria-busy="true">
            <div className={styles.detailSkeletonThumb} />
            <div className={styles.detailSkeletonLine} />
            <div className={styles.detailSkeletonLine} />
            <div className={styles.detailSkeletonBlock} />
          </div>
        ) : viewing.isError || !viewing.data ? (
          <div className={styles.detailError}>
            <p className="form-error">{adminErrorMessage(viewing.error)}</p>
            <Button variant="secondary" onClick={() => void viewing.refetch()}>Reintentar</Button>
          </div>
        ) : (
          <div className={styles.detailLayout}>
            <div className={styles.detailScroll}>
              <div className={styles.detailIdentity}>
                {image ? (
                  <img className={styles.detailImage} src={image.url} alt={image.altText ?? viewing.data.name} />
                ) : (
                  <span className={styles.detailImagePlaceholder} aria-hidden>Sin imagen</span>
                )}
                <div className={styles.detailIdentityCopy}>
                  <h3>{viewing.data.name}</h3>
                  <p className={styles.detailDescription}>
                    {viewing.data.description?.trim() || 'Sin descripción.'}
                  </p>
                </div>
              </div>

              <div className={styles.priceHighlight} aria-label="Precios">
                <div className={styles.priceSale}>
                  <span>Precio de venta</span>
                  <strong>{adminMoney(viewing.data.price)}</strong>
                  <small>Catálogo público</small>
                </div>
                <div className={styles.priceCost}>
                  <span>Precio de compra</span>
                  <strong>{adminMoney(viewing.data.cost)}</strong>
                  <small>Costo interno</small>
                </div>
              </div>

              <div className={styles.stockStrip} aria-label="Stock actual">
                <div>
                  <span>Físico</span>
                  <strong>{viewing.data.inventory.onHand}</strong>
                </div>
                <div>
                  <span>Reservado</span>
                  <strong>{viewing.data.inventory.reserved}</strong>
                </div>
                <div className={viewing.data.inventory.available <= 0 ? styles.stockOut : viewing.data.inventory.available <= 5 ? styles.stockLow : styles.stockOk}>
                  <span>Disponible</span>
                  <strong>{viewing.data.inventory.available}</strong>
                </div>
              </div>

              <DetailSection title="Producto">
                <DetailField label="SKU" value={<span className={shared.adminCode}>{viewing.data.sku}</span>} />
                <DetailField label="Slug" value={viewing.data.slug} />
                <DetailField label="Clase" value={adminLabel(viewing.data.kind)} />
                <DetailField label="Modo de stock" value={adminLabel(viewing.data.stockMode)} />
                <DetailField label="Versión" value={viewing.data.version} />
                <DetailField label="Actualizado" value={adminDate(viewing.data.updatedAt, true)} />
                <DetailField label="Publicado" value={viewing.data.publishedAt ? adminDate(viewing.data.publishedAt, true) : '—'} />
              </DetailSection>

              {card ? (
                <DetailSection title="Carta">
                  <DetailField label="Tipo" value={adminLabel(card.pokemonType)} />
                  <DetailField label="Set" value={card.setName} />
                  <DetailField label="Código" value={card.setCode} />
                  <DetailField label="Número" value={card.cardNumber} />
                  <DetailField label="Rareza" value={card.rarity} />
                  <DetailField label="Idioma" value={card.language} />
                  <DetailField label="Condición" value={adminLabel(card.condition)} />
                  <DetailField label="Acabado" value={card.finish} />
                  <DetailField label="Edición" value={card.edition} />
                  <DetailField label="Grading" value={[card.gradingCompany, card.grade].filter(Boolean).join(' · ') || null} />
                  <DetailField label="Certificación" value={card.certificationNumber} />
                </DetailSection>
              ) : null}
            </div>

            <div className={styles.detailFooter}>
              <div className={styles.detailPrimaryActions}>
                <Button variant="secondary" onClick={() => setViewingId(null)}>Cerrar</Button>
                <Link className="button" href={`/admin/products/${viewing.data.id}`}>Editar producto</Link>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={Boolean(adjusting)}
        onClose={() => !mutation.isPending && setAdjusting(null)}
        title="Ajustar inventario"
        description={adjusting ? `${adjusting.name} · físico ${adjusting.inventory.onHand} · reservado ${adjusting.inventory.reserved}` : undefined}
        className={shared.adminConfirmDialog}
      >
        <div className={shared.adminDialogForm}>
          <TextField
            label="Delta"
            type="number"
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
            hint="Usá un valor positivo para ingresar y negativo para retirar."
          />
          <TextareaField label="Motivo (opcional)" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
          <div className={shared.adminDialogActions}>
            <Button variant="secondary" onClick={() => setAdjusting(null)} disabled={mutation.isPending}>Volver</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !Number.isInteger(Number(delta)) || Number(delta) === 0}
            >
              {mutation.isPending ? 'Guardando…' : 'Registrar ajuste'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(null)}
        title="Historial de stock"
        description={historyProduct?.name}
        className={shared.adminWideDialog}
      >
        {adjustments.isLoading ? (
          <div className={shared.adminLoading}>Cargando movimientos</div>
        ) : adjustments.isError ? (
          <p className="form-error">{adminErrorMessage(adjustments.error)}</p>
        ) : (
          <>
            <ul className={shared.adminList}>
              {adjustments.data?.data.map((entry) => (
                <li key={entry.id}>
                  <div className={shared.adminListRow}>
                    <div>
                      <strong>{entry.delta > 0 ? `+${entry.delta}` : entry.delta} unidades</strong>
                      <span>{entry.reason.trim() || 'Sin motivo'}</span>
                    </div>
                    <div className={shared.adminAlignRight}>
                      <span>{adminDate(entry.createdAt, true)}</span>
                      <small>{entry.createdBy?.name ?? entry.createdBy?.email ?? 'Sistema'}</small>
                    </div>
                  </div>
                </li>
              ))}
              {!adjustments.data?.data.length && <li>Sin ajustes registrados.</li>}
            </ul>
            <CursorPagination
              canPrevious={adjustmentPages.length > 0}
              canNext={Boolean(adjustments.data?.nextCursor)}
              loading={adjustments.isFetching}
              onPrevious={() => { const copy = [...adjustmentPages]; setAdjustmentCursor(copy.pop()); setAdjustmentPages(copy); }}
              onNext={() => {
                if (!adjustments.data?.nextCursor) return;
                setAdjustmentPages((current) => [...current, adjustmentCursor]);
                setAdjustmentCursor(adjustments.data.nextCursor ?? undefined);
              }}
            />
          </>
        )}
      </Dialog>
    </>
  );
}
