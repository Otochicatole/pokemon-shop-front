'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Coins, ExternalLink, Handshake, Package, RefreshCw, RotateCcw, Store, Undo2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { AdminDataTable, AdminPageHeader, Button, ConfirmDialog, Dialog, TextareaField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge, adminLabel, adminMoney } from '@/shared/admin/format';
import type { AdminOrder } from '../domain/contracts';
import { cancelAdminOrder, fulfillLatePayment, getAdminOrder, recordFullRefund, reviewTransfer, transitionAdminOrder, transitionAdminSellerOrder } from '../infrastructure/api';
import styles from './admin-order-detail.module.css';

import shared from '@/components/admin/admin-shared.module.css';
type SellerOrder = AdminOrder['sellerOrders'][number];
type PendingAction = { kind: 'transition'; status: string } | { kind: 'seller-transition'; sellerOrderId: string; expectedVersion: number; status: SellerOrder['status']; sellerName: string } | { kind: 'cancel' } | { kind: 'receipt'; receiptId: string; decision: 'approve' | 'reject' } | { kind: 'late' } | { kind: 'refund' };

const sellerTransitionOptions: Array<{ action: SellerOrder['allowedActions'][number]; status: SellerOrder['status']; label: string }> = [
  { action: 'START_PREPARING', status: 'PREPARING', label: 'Empezar a preparar' },
  { action: 'READY_FOR_PICKUP', status: 'READY_FOR_PICKUP', label: 'Marcar lista para retirar' },
  { action: 'MARK_PICKED_UP', status: 'PICKED_UP', label: 'Marcar como retirada' },
  { action: 'MARK_SHIPPED', status: 'SHIPPED', label: 'Marcar como enviada' },
  { action: 'COMPLETE', status: 'COMPLETED', label: 'Completar entrega' },
];

function sellerTransitions(order: SellerOrder) {
  return sellerTransitionOptions.filter((option) => order.allowedActions.includes(option.action));
}

const redemptionLabels: Record<AdminOrder['loyalty']['redemptionStatus'], string> = {
  NONE: 'Sin canje',
  RESERVED: 'Puntos reservados',
  REDEEMED: 'Canje acreditado',
  RELEASED: 'Reserva liberada',
  RESTORED: 'Puntos devueltos',
};

function earnedPointsState(order: AdminOrder) {
  if (order.loyalty.pointsEarned === 0) return 'No genera puntos';
  if (order.status === 'REFUND_RECORDED' || order.payment?.status === 'REFUNDED') return 'Revertidos por reembolso';
  if (order.payment?.status === 'APPROVED') return 'Acreditados';
  return 'Pendientes hasta aprobar el pago';
}

function previousTimelineStatus(order: AdminOrder) {
  if (!order.allowedActions.includes('ROLLBACK')) return null;
  for (let index = order.timeline.length - 1; index >= 0; index -= 1) {
    if (order.timeline[index]?.toStatus === order.status) return order.timeline[index - 1]?.toStatus ?? null;
  }
  return null;
}

function Detail({ order }: { order: AdminOrder }) {
  const fulfillment = order.fulfillment;
  return <div className={shared.adminDetailGrid}><div className={shared.adminDetailStack}><section className={shared.adminPanel}><div className={shared.adminPanelHeader}><h2>Ítems ({order.items.length})</h2></div><AdminDataTable rows={order.items} rowKey={(item) => item.id} columns={[{ key: 'item', header: 'Producto', render: (item) => <div className={shared.adminTablePrimary}>{item.imageUrl ? <Image src={item.imageUrl} alt="" width={46} height={56} unoptimized /> : <span className={shared.adminTableThumb} />}<div><strong>{item.name}</strong><span>{item.sku}</span></div></div> }, { key: 'price', header: 'Precio', align: 'right', render: (item) => adminMoney(item.unitPrice) }, { key: 'qty', header: 'Cant.', align: 'center', render: (item) => item.quantity }, { key: 'total', header: 'Subtotal', align: 'right', render: (item) => <span className={shared.adminMoney}>{adminMoney(item.lineTotal)}</span> }]} /></section>
    <section className={shared.adminPanel}><div className={shared.adminPanelHeader}><h2>Pago</h2>{order.payment && <AdminBadge value={order.payment.status} />}</div><div className={shared.adminPanelBody}><dl className={shared.adminDefinitionList}><dt>Método</dt><dd>{adminLabel(order.paymentMethod)}</dd><dt>Monto</dt><dd>{adminMoney(order.payment?.amount)}</dd><dt>Referencia proveedor</dt><dd>{order.payment?.providerReference ?? '—'}</dd>{order.payment?.bankTransfer && <><dt>Referencia bancaria</dt><dd>{order.payment.bankTransfer.reference}</dd><dt>Revisión</dt><dd>{adminLabel(order.payment.bankTransfer.reviewStatus)}</dd></>}{order.payment?.mercadoPago && <><dt>ID Mercado Pago</dt><dd>{order.payment.mercadoPago.externalPaymentId ?? '—'}</dd><dt>Detalle</dt><dd>{order.payment.mercadoPago.statusDetail ?? order.payment.mercadoPago.status ?? '—'}</dd></>}</dl>{order.payment?.refunds.map((refund) => <div className={[shared.adminNotice, styles.isWarning].filter(Boolean).join(' ')} key={refund.id}>Reembolso total {adminMoney(refund.amount)} · {refund.reason} · {refund.externalReference}</div>)}</div></section>
    {order.receipts.length > 0 && <section className={shared.adminPanel}><div className={shared.adminPanelHeader}><h2>Comprobantes</h2></div><div className={shared.adminPanelBody}><ul className={shared.adminList}>{order.receipts.map((receipt) => <li key={receipt.id}><div className={shared.adminListRow}><div><strong>Subido {adminDate(receipt.createdAt, true)}</strong><span>{receipt.note ?? 'Sin observaciones'}</span></div><div className={styles.adminReceiptActions}><AdminBadge value={receipt.review} /><a className={shared.adminIconButton} href={receipt.url} target="_blank" rel="noreferrer" aria-label="Abrir comprobante"><ExternalLink size={16} /></a></div></div></li>)}</ul></div></section>}
    <section className={shared.adminPanel}><div className={shared.adminPanelHeader}><h2>Timeline</h2></div><div className={shared.adminPanelBody}><ol className={shared.adminTimeline}>{order.timeline.map((event) => <li key={event.id}><strong>{adminLabel(event.toStatus)}</strong><span>{adminDate(event.createdAt, true)}{event.note ? ` · ${event.note}` : ''}</span></li>)}</ol></div></section></div>
    <aside className={shared.adminDetailStack}><section className={shared.adminPanel}><div className={shared.adminPanelHeader}><h2>Resumen</h2></div><div className={shared.adminPanelBody}><dl className={shared.adminDefinitionList}><dt>Subtotal</dt><dd>{adminMoney(order.totals.subtotal)}</dd><dt>Descuento por puntos</dt><dd>{BigInt(order.totals.discount.amountMinor) > 0n ? `−${adminMoney(order.totals.discount)}` : adminMoney(order.totals.discount)}</dd><dt>Envío</dt><dd>{adminMoney(order.totals.shipping)}</dd><dt>Total</dt><dd className={shared.adminMoney}>{adminMoney(order.totals.total)}</dd><dt>Expira</dt><dd>{adminDate(order.expiresAt, true)}</dd><dt>Versión</dt><dd>{order.version}</dd></dl></div></section><section className={shared.adminPanel}><div className={shared.adminPanelHeader}><h2><Coins size={15} /> Fidelidad</h2></div><div className={shared.adminPanelBody}><dl className={shared.adminDefinitionList}><dt>Puntos usados</dt><dd>{order.loyalty.pointsRedeemed}</dd><dt>Estado del canje</dt><dd>{redemptionLabels[order.loyalty.redemptionStatus]}</dd><dt>Descuento aplicado</dt><dd>{adminMoney(order.loyalty.pointsDiscount)}</dd><dt>Puntos generados</dt><dd>{order.loyalty.pointsEarned}</dd><dt>Acreditación</dt><dd>{earnedPointsState(order)}</dd><dt>Versión del programa</dt><dd>{order.loyalty.programVersion ?? '—'}</dd><dt>Monto base de acumulación</dt><dd>{adminMoney(order.loyalty.spendPerPoint)}</dd><dt>Valor por punto</dt><dd>{adminMoney(order.loyalty.pointValue)}</dd></dl></div></section><section className={shared.adminPanel}><div className={shared.adminPanelHeader}><h2>Cliente</h2></div><div className={shared.adminPanelBody}><dl className={shared.adminDefinitionList}><dt>Nombre</dt><dd>{order.customer.name ?? '—'}</dd><dt>Email</dt><dd><Link href={`/admin/customers/${order.customer.id}`}>{order.customer.email}</Link></dd><dt>Estado</dt><dd>{adminLabel(order.customer.status)}</dd></dl></div></section><section className={shared.adminPanel}><div className={shared.adminPanelHeader}><h2>Entrega</h2><AdminBadge value={order.fulfillmentType} /></div><div className={shared.adminPanelBody}><dl className={shared.adminDefinitionList}>{Object.entries(fulfillment).filter(([, value]) => value !== null && value !== '').map(([key, value]) => <div className={shared.adminDefinitionRow} key={key}><dt>{adminLabel(key)}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></div></section></aside></div>;
}

function SellerOrdersAdminSection({ order, onTransition, busy }: { order: AdminOrder; onTransition: (sellerOrder: SellerOrder, status: SellerOrder['status']) => void; busy: boolean }) {
  if (order.sellerOrders.length === 0) return null;
  return (
    <section className={[shared.adminPanel, styles.adminSellerOrdersPanel].filter(Boolean).join(' ')}>
      <div className={[shared.adminPanelHeader, styles.sellerOrderAdminHeader].filter(Boolean).join(' ')}>
        <div>
          <span className={shared.adminPanelKicker}>Operación logística</span>
          <h2>Subórdenes por vendedor</h2>
          <p>Gestioná la preparación y entrega de cada vendedor por separado.</p>
        </div>
        <AdminBadge value={`${order.sellerOrders.length} ${order.sellerOrders.length === 1 ? 'vendedor' : 'vendedores'}`} />
      </div>

      <div className={[shared.adminPanelBody, styles.sellerOrderAdminList].filter(Boolean).join(' ')}>
        {order.sellerOrders.map((sellerOrder) => {
          const transitions = sellerTransitions(sellerOrder);
          const isAffiliate = sellerOrder.sellerType === 'AFFILIATE';
          const productCount = sellerOrder.items.length;
          const hasActions = transitions.length > 0 || isAffiliate;

          return (
            <article className={`${styles.sellerOrderAdminCard} ${isAffiliate ? styles.isAffiliate : 'is-store'}${hasActions ? '' : ' has-no-actions'}`} key={sellerOrder.id}>
              <div className={styles.sellerOrderAdminIdentity}>
                <span className={styles.sellerOrderAdminIcon} aria-hidden="true">
                  {isAffiliate ? <Handshake size={21} /> : <Store size={21} />}
                </span>
                <div>
                  <span className={styles.sellerOrderAdminType}>{isAffiliate ? 'Afiliado' : 'Tienda propia'}</span>
                  <h3>{sellerOrder.sellerName}</h3>
                  <span className={styles.sellerOrderAdminNumber}>{sellerOrder.number}</span>
                </div>
              </div>

              <div className={styles.sellerOrderAdminSummary}>
                <div className={styles.sellerOrderAdminSummaryItem}>
                  <span>Estado actual</span>
                  <AdminBadge value={sellerOrder.status} />
                </div>
                <div className={styles.sellerOrderAdminSummaryItem}>
                  <span>{isAffiliate ? 'Neto afiliado' : 'Importe tienda'}</span>
                  <strong>{adminMoney(sellerOrder.sellerNet)}</strong>
                </div>
                <div className={[styles.sellerOrderAdminSummaryItem, styles.sellerOrderAdminProducts].filter(Boolean).join(' ')}>
                  <span>Contenido</span>
                  <strong><Package size={15} />{productCount} {productCount === 1 ? 'producto' : 'productos'}</strong>
                </div>
              </div>

              {hasActions && (
                <div className={styles.sellerOrderAdminActions}>
                  {transitions.map((transition) => (
                    <Button key={transition.action} onClick={() => onTransition(sellerOrder, transition.status)} disabled={busy}>
                      <CheckCircle2 size={16} />
                      {transition.label}
                    </Button>
                  ))}
                  {isAffiliate && (
                    <Link className="button button-secondary" href={`/admin/affiliates/orders/${sellerOrder.id}`}>
                      Ver detalle
                    </Link>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function AdminOrderDetailView({ number }: { number: string }) {
  const queryClient = useQueryClient(); const [action, setAction] = useState<PendingAction | null>(null); const [note, setNote] = useState(''); const [reference, setReference] = useState('');
  const query = useQuery({ queryKey: ['admin', 'order', number], queryFn: () => getAdminOrder(number), refetchInterval: 30_000 });
  const mutation = useMutation({ mutationFn: async () => { const order = query.data!; if (!action) return; if (action.kind === 'transition') return transitionAdminOrder(number, order.version, action.status, note); if (action.kind === 'seller-transition') return transitionAdminSellerOrder(action.sellerOrderId, action.expectedVersion, action.status, note); if (action.kind === 'cancel') return cancelAdminOrder(number, order.version, note); if (action.kind === 'receipt') return reviewTransfer(number, action.receiptId, order.version, action.decision, note); if (action.kind === 'late') return fulfillLatePayment(number, order.version); return recordFullRefund(number, order.version, note, reference); }, onSuccess: async () => { toast.success('Orden actualizada'); setAction(null); setNote(''); setReference(''); await query.refetch(); await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }); await queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] }); await queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate-orders'] }); }, onError: (error) => toast.error(adminErrorMessage(error)) });
  if (query.isLoading) return <div className={shared.adminLoading}>Cargando orden</div>;
  if (query.isError || !query.data) return <div className={shared.adminErrorPanel}><div><h1>Orden no disponible</h1><p>{adminErrorMessage(query.error)}</p><Link className="button button-secondary" href="/admin/orders">Volver</Link></div></div>;
  const order = query.data;
  const transitions = order.allowedActions.filter((item) => item.startsWith('TRANSITION_')).map((item) => item.replace('TRANSITION_', ''));
  const rollbackStatus = previousTimelineStatus(order);
  return <><AdminPageHeader eyebrow={`Orden // ${order.number}`} title={order.number} description={`${adminDate(order.createdAt, true)} · ${order.customer.email}`} actions={<><Link className="button button-secondary" href="/admin/orders"><ArrowLeft size={16} />Volver</Link><Button variant="secondary" onClick={() => void query.refetch()}><RefreshCw size={16} />Actualizar</Button><AdminBadge value={order.status} /></>} />
    <div className={styles.adminOrderActions}>{transitions.map((status) => <Button key={status} variant="secondary" onClick={() => setAction({ kind: 'transition', status })}><CheckCircle2 size={16} />{adminLabel(status)}</Button>)}{rollbackStatus && <Button variant="secondary" onClick={() => setAction({ kind: 'transition', status: rollbackStatus })}><Undo2 size={16} />Volver a {adminLabel(rollbackStatus)}</Button>}{order.allowedActions.includes('CANCEL') && <Button variant="danger" onClick={() => setAction({ kind: 'cancel' })}><XCircle size={16} />Cancelar</Button>}{order.allowedActions.includes('FULFILL_LATE_PAYMENT') && <Button onClick={() => setAction({ kind: 'late' })}>Validar stock y continuar</Button>}{order.allowedActions.includes('RECORD_FULL_REFUND') && <Button variant="danger" onClick={() => setAction({ kind: 'refund' })}><RotateCcw size={16} />Registrar reembolso total</Button>}</div>
    {order.allowedActions.includes('REVIEW_TRANSFER') && <div className={[shared.adminNotice, styles.isWarning].filter(Boolean).join(' ')}>Hay un comprobante pendiente. Revisá el archivo exacto antes de aprobar o rechazar.</div>}
    {order.receipts.filter((receipt) => receipt.review === 'PENDING').map((receipt) => <div className={styles.adminReceiptReview} key={receipt.id}><span>Comprobante {receipt.id.slice(0, 8)} · {adminDate(receipt.createdAt, true)}</span><div><Button variant="secondary" onClick={() => setAction({ kind: 'receipt', receiptId: receipt.id, decision: 'approve' })}>Aprobar</Button><Button variant="danger" onClick={() => setAction({ kind: 'receipt', receiptId: receipt.id, decision: 'reject' })}>Rechazar</Button></div></div>)}
    <SellerOrdersAdminSection order={order} busy={mutation.isPending} onTransition={(sellerOrder, status) => setAction({ kind: 'seller-transition', sellerOrderId: sellerOrder.id, expectedVersion: sellerOrder.version, status, sellerName: sellerOrder.sellerName })} />
    <Detail order={order} />
    <ConfirmDialog open={Boolean(action && action.kind !== 'refund')} onClose={() => !mutation.isPending && setAction(null)} onConfirm={() => mutation.mutate()} busy={mutation.isPending} danger={action?.kind === 'cancel' || (action?.kind === 'receipt' && action.decision === 'reject')} title={action?.kind === 'transition' ? `${rollbackStatus === action.status ? 'Volver a' : 'Pasar a'} ${adminLabel(action.status)}` : action?.kind === 'seller-transition' ? `${action.sellerName}: pasar a ${adminLabel(action.status)}` : action?.kind === 'cancel' ? 'Cancelar orden' : action?.kind === 'receipt' ? `${action.decision === 'approve' ? 'Aprobar' : 'Rechazar'} comprobante` : 'Continuar pago tardío'} description="El backend volverá a validar versión, estado, pago y reservas dentro de una transacción."><TextareaField label="Nota interna (opcional)" value={note} onChange={(event) => setNote(event.target.value)} /></ConfirmDialog>
    <Dialog open={action?.kind === 'refund'} onClose={() => !mutation.isPending && setAction(null)} title="Registrar reembolso total" description={`Se registrará el monto completo pagado (${adminMoney(order.payment?.amount)}). Esta acción no repone stock.`} className={shared.adminConfirmDialog}><div className={shared.adminDialogForm}><TextareaField label="Motivo" value={note} onChange={(event) => setNote(event.target.value)} /><TextField label="Referencia externa" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="ID del reembolso realizado" /><div className={shared.adminDialogActions}><Button variant="secondary" onClick={() => setAction(null)} disabled={mutation.isPending}>Volver</Button><Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending || note.trim().length < 3 || reference.trim().length < 3}>Registrar</Button></div></div></Dialog>
  </>;
}
