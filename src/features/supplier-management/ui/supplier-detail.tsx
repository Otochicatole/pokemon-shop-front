'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { AdminDataTable, AdminPageHeader, Button, ConfirmDialog, CursorPagination } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge, adminMoney } from '@/shared/admin/format';
import { listPurchases, loadSupplier, removePurchase } from '../application';
import type { SupplierPurchase } from '../domain/contracts';
import styles from './supplier-detail.module.css';
import shared from '@/components/admin/admin-shared.module.css';

export function SupplierDetailView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<Array<string | undefined>>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<SupplierPurchase | null>(null);

  const supplier = useQuery({ queryKey: ['admin', 'suppliers', id], queryFn: () => loadSupplier(id) });
  const purchases = useQuery({
    queryKey: ['admin', 'suppliers', id, 'purchases', cursor],
    queryFn: () => listPurchases(id, cursor),
    enabled: Boolean(supplier.data),
    placeholderData: (previous) => previous,
  });

  const remove = useMutation({
    mutationFn: () => (pendingDelete ? removePurchase(id, pendingDelete.id) : Promise.resolve()),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers', id, 'purchases'] });
      toast.success('Compra eliminada del historial');
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });

  const toggle = (purchaseId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(purchaseId)) next.delete(purchaseId);
      else next.add(purchaseId);
      return next;
    });
  };

  if (supplier.isLoading) return <div className={shared.adminLoading}>Cargando proveedor</div>;
  if (supplier.isError || !supplier.data) {
    return (
      <div className={shared.adminErrorPanel}>
        <div>
          <h2>No pudimos cargar el proveedor</h2>
          <p>{adminErrorMessage(supplier.error)}</p>
          <Button variant="secondary" onClick={() => void supplier.refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  const row = supplier.data;
  const rows = purchases.data?.data ?? [];

  return (
    <>
      <AdminPageHeader
        eyebrow="Proveedor // Historial"
        title={row.name}
        description="Compras registradas a este proveedor. No afectan el inventario de la tienda."
        actions={
          <>
            <Link className="button button-secondary" href="/admin/suppliers"><ArrowLeft size={16} />Volver</Link>
            <Link className="button" href={`/admin/suppliers/${id}/purchases/new`}><Plus size={16} />Registrar compra</Link>
          </>
        }
      />
      <div className={styles.detailGrid}>
        <section className={shared.adminFormSection}>
          <div className={shared.adminFormSectionHeading}>
            <h2>Ficha</h2>
            <AdminBadge value={row.active ? 'ACTIVE' : 'INACTIVE'} />
          </div>
          <dl className={shared.adminDefinitionList}>
            <dt>Contacto</dt><dd>{row.contactName || '—'}</dd>
            <dt>Email</dt><dd>{row.email || '—'}</dd>
            <dt>Teléfono</dt><dd>{row.phone || '—'}</dd>
            <dt>Dirección</dt><dd>{row.address || '—'}</dd>
            <dt>Notas</dt><dd>{row.notes || '—'}</dd>
          </dl>
        </section>
        <section className={`${shared.adminFormSection} ${styles.historySection}`}>
          <div className={shared.adminFormSectionHeading}>
            <h2>Historial de compras</h2>
          </div>
          {purchases.isLoading ? <div className={shared.adminLoading}>Cargando compras</div> : purchases.isError ? (
            <div className={shared.adminErrorPanel}><div><h2>No pudimos cargar el historial</h2><p>{adminErrorMessage(purchases.error)}</p><Button variant="secondary" onClick={() => void purchases.refetch()}>Reintentar</Button></div></div>
          ) : (
            <>
              <AdminDataTable
                caption="Compras al proveedor"
                rows={rows}
                rowKey={(purchase) => purchase.id}
                empty="Todavía no hay compras registradas para este proveedor."
                columns={[
                  {
                    key: 'expand',
                    header: '',
                    headerLabel: 'Detalle',
                    render: (purchase) => (
                      <button type="button" className={shared.adminIconButton} onClick={() => toggle(purchase.id)} aria-label={expanded.has(purchase.id) ? 'Ocultar ítems' : 'Ver ítems'}>
                        {expanded.has(purchase.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    ),
                  },
                  { key: 'date', header: 'Fecha', render: (purchase) => adminDate(purchase.purchasedAt, true) },
                  { key: 'items', header: 'Ítems', align: 'center', render: (purchase) => <strong>{purchase.itemCount}</strong> },
                  { key: 'total', header: 'Total costo', align: 'right', render: (purchase) => <span className={shared.adminMoney}>{adminMoney(purchase.totalCost)}</span> },
                  { key: 'note', header: 'Nota', render: (purchase) => purchase.note || <span className={shared.adminMuted}>—</span> },
                  {
                    key: 'actions',
                    header: 'Acción',
                    align: 'right',
                    render: (purchase) => (
                      <button className={shared.adminIconButton} type="button" onClick={() => setPendingDelete(purchase)} aria-label="Eliminar compra">
                        <Trash2 size={16} />
                      </button>
                    ),
                  },
                ]}
              />
              {rows.filter((purchase) => expanded.has(purchase.id)).map((purchase) => (
                <div key={`items-${purchase.id}`} className={styles.itemPanel}>
                  <h3>Detalle · {adminDate(purchase.purchasedAt, true)}</h3>
                  <AdminDataTable
                    caption={`Ítems de compra ${purchase.id}`}
                    rows={purchase.items}
                    rowKey={(item) => item.id}
                    columns={[
                      { key: 'sku', header: 'SKU', render: (item) => <span className={shared.adminCode}>{item.productSku}</span> },
                      { key: 'name', header: 'Producto', render: (item) => item.productName },
                      { key: 'qty', header: 'Cant.', align: 'center', render: (item) => item.quantity },
                      { key: 'unit', header: 'Costo unit.', align: 'right', render: (item) => adminMoney(item.unitCost) },
                      { key: 'line', header: 'Subtotal', align: 'right', render: (item) => adminMoney(item.lineTotal) },
                    ]}
                  />
                </div>
              ))}
              <CursorPagination
                canPrevious={history.length > 0}
                canNext={Boolean(purchases.data?.meta.nextCursor)}
                loading={purchases.isFetching}
                onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }}
                onNext={() => {
                  const next = purchases.data?.meta.nextCursor;
                  if (!next) return;
                  setHistory((current) => [...current, cursor]);
                  setCursor(next);
                }}
              />
            </>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar compra del historial"
        description="Se borrará el registro de compra. El inventario no se modifica."
        confirmLabel="Eliminar"
        danger
        busy={remove.isPending}
        onClose={() => !remove.isPending && setPendingDelete(null)}
        onConfirm={() => void remove.mutateAsync()}
      />
    </>
  );
}
