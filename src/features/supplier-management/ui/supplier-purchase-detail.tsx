'use client';
/* Product thumbnails may come from the media CDN. */
/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { AdminPageHeader, Button, ConfirmDialog } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge, adminLabel, adminMoney } from '@/shared/admin/format';
import { loadPurchase, loadSupplier, removePurchase } from '../application';
import type { SupplierPurchaseItem } from '../domain/contracts';
import styles from './supplier-purchase-detail.module.css';
import shared from '@/components/admin/admin-shared.module.css';

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </>
  );
}

function PurchaseItemDetail({ item, index }: { item: SupplierPurchaseItem; index: number }) {
  const product = item.product;
  const card = product?.pokemonCard;

  return (
    <article className={styles.itemCard}>
      <div className={styles.itemHeader}>
        <div className={styles.itemTitle}>
          {product?.imageUrl ? (
            <img className={styles.itemImage} src={product.imageUrl} alt="" />
          ) : (
            <span className={styles.itemImagePlaceholder} aria-hidden />
          )}
          <div>
            <strong>Línea {index + 1}</strong>
            <h3>{product?.name ?? item.productName}</h3>
            <span className={shared.adminCode}>{product?.sku ?? item.productSku}</span>
          </div>
        </div>
        {product ? <AdminBadge value={product.status} /> : <span className={shared.adminMuted}>Producto no disponible</span>}
      </div>

      <div className={styles.itemColumns}>
        <section>
          <h4>Compra</h4>
          <dl className={shared.adminDefinitionList}>
            <DetailField label="Cantidad" value={item.quantity} />
            <DetailField label="Costo unitario" value={adminMoney(item.unitCost)} />
            <DetailField label="Subtotal" value={<span className={shared.adminMoney}>{adminMoney(item.lineTotal)}</span>} />
          </dl>
        </section>

        <section>
          <h4>Producto</h4>
          <dl className={shared.adminDefinitionList}>
            <DetailField label="SKU" value={<span className={shared.adminCode}>{product?.sku ?? item.productSku}</span>} />
            <DetailField label="Slug" value={product?.slug ?? '—'} />
            <DetailField label="Nombre" value={product?.name ?? item.productName} />
            <DetailField label="Descripción" value={product?.description || '—'} />
            <DetailField label="Clase" value={adminLabel(product?.kind)} />
            <DetailField label="Modo de stock" value={adminLabel(product?.stockMode)} />
            <DetailField label="Estado" value={adminLabel(product?.status)} />
            <DetailField label="Precio de venta" value={product ? adminMoney(product.price) : '—'} />
            <DetailField
              label="Catálogo"
              value={
                item.productId ? (
                  <Link className={shared.adminTableLink} href={`/admin/products/${item.productId}`}>Abrir producto</Link>
                ) : '—'
              }
            />
          </dl>
        </section>

        {card ? (
          <section>
            <h4>Datos de la carta</h4>
            <dl className={shared.adminDefinitionList}>
              <DetailField label="Tipo / atributo" value={card.pokemonType ?? '—'} />
              <DetailField label="Condición" value={adminLabel(card.condition)} />
              <DetailField label="Colección / set" value={card.setName} />
              <DetailField label="Código de set" value={card.setCode ?? '—'} />
              <DetailField label="Número" value={card.cardNumber} />
              <DetailField label="Rareza" value={card.rarity} />
              <DetailField label="Idioma" value={card.language} />
              <DetailField label="Acabado / foil" value={card.finish ?? '—'} />
              <DetailField label="Edición" value={card.edition ?? '—'} />
              <DetailField label="Empresa de grading" value={card.gradingCompany ?? '—'} />
              <DetailField label="Grado" value={card.grade ?? '—'} />
              <DetailField label="Certificación" value={card.certificationNumber ?? '—'} />
            </dl>
          </section>
        ) : null}
      </div>
    </article>
  );
}

export function SupplierPurchaseDetailView({ supplierId, purchaseId }: { supplierId: string; purchaseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const supplier = useQuery({ queryKey: ['admin', 'suppliers', supplierId], queryFn: () => loadSupplier(supplierId) });
  const purchase = useQuery({
    queryKey: ['admin', 'suppliers', supplierId, 'purchases', purchaseId],
    queryFn: () => loadPurchase(supplierId, purchaseId),
  });

  const remove = useMutation({
    mutationFn: () => removePurchase(supplierId, purchaseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers', supplierId, 'purchases'] });
      toast.success('Compra eliminada del historial');
      router.push(`/admin/suppliers/${supplierId}`);
      router.refresh();
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });

  if (supplier.isLoading || purchase.isLoading) return <div className={shared.adminLoading}>Cargando compra</div>;
  if (supplier.isError || !supplier.data || purchase.isError || !purchase.data) {
    return (
      <div className={shared.adminErrorPanel}>
        <div>
          <h2>No pudimos cargar la compra</h2>
          <p>{adminErrorMessage(purchase.error ?? supplier.error)}</p>
          <div className={styles.errorActions}>
            <Button variant="secondary" onClick={() => { void supplier.refetch(); void purchase.refetch(); }}>Reintentar</Button>
            <Link className="button button-secondary" href={`/admin/suppliers/${supplierId}`}>Volver al proveedor</Link>
          </div>
        </div>
      </div>
    );
  }

  const row = purchase.data;
  const supplierRow = supplier.data;

  return (
    <>
      <AdminPageHeader
        eyebrow={`Proveedor // ${supplierRow.name}`}
        title={`Compra · ${adminDate(row.purchasedAt, true)}`}
        description="Detalle completo del registro de compra. No afecta el inventario de la tienda."
        actions={
          <>
            <Link className="button button-secondary" href={`/admin/suppliers/${supplierId}`}>
              <ArrowLeft size={16} />Volver al historial
            </Link>
            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} />Eliminar
            </Button>
          </>
        }
      />

      <div className={styles.detailLayout}>
        <aside className={styles.sidebar}>
          <section className={shared.adminFormSection}>
            <h2>Resumen de la compra</h2>
            <dl className={shared.adminDefinitionList}>
              <DetailField label="Fecha de compra" value={adminDate(row.purchasedAt, true)} />
              <DetailField label="Registrada" value={adminDate(row.createdAt, true)} />
              <DetailField label="Actualizada" value={adminDate(row.updatedAt, true)} />
              <DetailField label="Ítems" value={<strong>{row.itemCount}</strong>} />
              <DetailField label="Total costo" value={<span className={shared.adminMoney}>{adminMoney(row.totalCost)}</span>} />
              <DetailField label="Nota" value={row.note || '—'} />
              <DetailField
                label="Registrada por"
                value={row.createdBy ? (row.createdBy.name ? `${row.createdBy.name} · ${row.createdBy.email}` : row.createdBy.email) : '—'}
              />
              <DetailField label="ID" value={<span className={shared.adminCode}>{row.id}</span>} />
            </dl>
          </section>

          <section className={shared.adminFormSection}>
            <div className={shared.adminFormSectionHeading}>
              <h2>Proveedor</h2>
              <AdminBadge value={supplierRow.active ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <dl className={shared.adminDefinitionList}>
              <DetailField label="Nombre" value={supplierRow.name} />
              <DetailField label="Contacto" value={supplierRow.contactName || '—'} />
              <DetailField label="Email" value={supplierRow.email || '—'} />
              <DetailField label="Teléfono" value={supplierRow.phone || '—'} />
              <DetailField label="Dirección" value={supplierRow.address || '—'} />
              <DetailField label="Notas" value={supplierRow.notes || '—'} />
            </dl>
          </section>
        </aside>

        <section className={`${shared.adminFormSection} ${styles.itemsSection}`}>
          <div className={shared.adminFormSectionHeading}>
            <h2>Productos de la compra</h2>
          </div>
          {row.items.length === 0 ? (
            <p className={shared.adminMuted}>Esta compra no tiene ítems.</p>
          ) : (
            <div className={styles.itemsList}>
              {row.items.map((item, index) => (
                <PurchaseItemDetail key={item.id} item={item} index={index} />
              ))}
            </div>
          )}
          <div className={styles.totalRow}>
            <span>Total de la compra</span>
            <strong className={shared.adminMoney}>{adminMoney(row.totalCost)}</strong>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar compra del historial"
        description="Se borrará el registro de compra. El inventario no se modifica."
        confirmLabel="Eliminar"
        danger
        busy={remove.isPending}
        onClose={() => !remove.isPending && setConfirmDelete(false)}
        onConfirm={() => void remove.mutateAsync()}
      />
    </>
  );
}
