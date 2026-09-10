'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { getOrder, cancelOrder } from '../infrastructure/api';
import { uploadReceipt } from '@/features/checkout/infrastructure/api';
import { formatDate, formatMoney, statusLabel } from '@/shared/lib/format';
import { Button } from '@/components/button';
import { Dialog } from '@/components/overlay';

export function OrderDetail({ number }: { number: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['order', number], queryFn: () => getOrder(number) });
  const [busy, setBusy] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  if (query.isLoading) return <div className="page-loading">Cargando orden…</div>;
  if (query.isError || !query.data) return <div className="empty-state"><h1>Orden no encontrada</h1><Link href="/account/orders" className="button button-secondary">Volver a mis órdenes</Link></div>;
  const order = query.data;
  const payment = order.payment as { method?: string; bankReference?: string; bankInstructions?: { bankName?: string; accountHolder?: string; cbu?: string | null; alias?: string | null }; receipt?: { review?: string }; checkoutUrl?: string | null } | null;
  const canCancel = ['PENDING_PAYMENT', 'PAYMENT_REVIEW'].includes(order.status);
  const credited = ['PAID', 'PREPARING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED'].includes(order.status);
  const onReceipt = async (file: File) => {
    setBusy(true);
    try { await uploadReceipt(order.number, file); await query.refetch(); toast.success('Comprobante recibido'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'No pudimos subir el comprobante'); }
    finally { setBusy(false); }
  };
  const confirmCancel = async () => {
    setBusy(true);
    try {
      await cancelOrder(order.number);
      await Promise.all([query.refetch(), queryClient.invalidateQueries({ queryKey: ['loyalty-account'] })]);
      setCancelDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cancelar');
    } finally {
      setBusy(false);
    }
  };
  return <div className="order-page">
    <Link href="/account/orders" className="back-link"><ArrowLeft size={15} aria-hidden="true" />Volver a mis órdenes</Link>
    <div className="section-heading">
      <p className="eyebrow">Orden {order.number}</p>
      <div className="heading-row"><h1>{statusLabel(order.status)}</h1><span className="status-pill">{statusLabel(order.status)}</span></div>
      <p>Creada el {formatDate(order.createdAt)}</p>
    </div>
    <div className="order-columns">
      <section className="order-card">
        <h2>Productos</h2>
        {order.items.map((item) => <div className="summary-line" key={item.productId}><span>{item.name} × {item.quantity}</span><strong>{formatMoney(item.lineTotal)}</strong></div>)}
        <div className="summary-line"><span>Subtotal</span><strong>{formatMoney(order.totals.subtotal)}</strong></div>
        {BigInt(order.totals.discount.amountMinor) > 0n && <div className="summary-line loyalty-discount"><span>Descuento por puntos</span><strong>−{formatMoney(order.totals.discount)}</strong></div>}
        <div className="summary-line"><span>Envío</span><strong>{formatMoney(order.totals.shipping)}</strong></div>
        <div className="summary-total"><span>Total</span><strong>{formatMoney(order.totals.total)}</strong></div>
        {(order.loyalty.pointsRedeemed > 0 || order.loyalty.pointsEarned > 0) && <div className="order-loyalty"><Coins size={18} /><div>{order.loyalty.pointsRedeemed > 0 && <p><strong>{order.loyalty.pointsRedeemed} puntos usados</strong> · {order.loyalty.redemptionStatus === 'RESERVED' ? 'reservados hasta acreditar el pago' : order.loyalty.redemptionStatus === 'RELEASED' ? 'devueltos por cierre de la orden' : order.loyalty.redemptionStatus === 'RESTORED' ? 'devueltos por reembolso' : 'canje acreditado'}</p>}<p><strong>{order.loyalty.pointsEarned} puntos por la compra</strong> · {order.status === 'REFUND_RECORDED' ? 'revertidos por reembolso' : credited ? 'acreditados' : 'se acreditan al aprobar el pago'}</p></div></div>}
      </section>
      <section className="order-card">
        <h2>{order.fulfillmentType === 'PICKUP' ? 'Retiro' : 'Envío'}</h2>
        <p>{order.fulfillmentType === 'PICKUP' ? 'Retiro en el punto seleccionado.' : `${String(order.fulfillment?.addressLine1 ?? '')}, ${String(order.fulfillment?.city ?? '')}, ${String(order.fulfillment?.province ?? '')}`}</p>
        <h2 className="mt">Pago</h2>
        <p>{payment?.method === 'BANK_TRANSFER' ? `Transferencia · referencia ${payment.bankReference ?? 'pendiente'}` : 'Mercado Pago'}</p>
        {payment?.bankInstructions && <div className="bank-details"><strong>Datos para transferir</strong><span>{payment.bankInstructions.bankName}</span><span>{payment.bankInstructions.accountHolder}</span>{payment.bankInstructions.cbu && <span>CBU: {payment.bankInstructions.cbu}</span>}{payment.bankInstructions.alias && <span>Alias: {payment.bankInstructions.alias}</span>}</div>}
        {payment?.method === 'BANK_TRANSFER' && !payment.receipt && canCancel && <label className="upload-box">Subir comprobante<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onReceipt(file); }} /></label>}
        {payment?.receipt && <p className="form-hint">Comprobante: {payment.receipt.review === 'APPROVED' ? 'aprobado' : payment.receipt.review === 'REJECTED' ? 'rechazado' : 'en revisión'}</p>}
        {canCancel && <Button variant="ghost" className="cancel-button" disabled={busy} onClick={() => setCancelDialogOpen(true)}>Cancelar orden</Button>}
      </section>
      <section className="order-card order-timeline-card">
        <h2>Seguimiento de la orden</h2>
        {order.timeline.length > 0 ? <ol className="order-timeline">{order.timeline.map((event, index) => <li className={index === order.timeline.length - 1 ? 'is-current' : ''} key={event.id}><span className="order-timeline-marker" aria-hidden="true" /><div><strong>{statusLabel(event.toStatus)}</strong><span>{formatDate(event.createdAt)}{index === order.timeline.length - 1 ? ' · Estado actual' : ''}</span></div></li>)}</ol> : <p className="form-hint">Todavía no hay eventos de seguimiento para esta orden.</p>}
      </section>
    </div>
    <Dialog open={cancelDialogOpen} title="Cancelar orden" description="Esta acción cancelará la orden y liberará las reservas asociadas. ¿Querés continuar?" onClose={() => !busy && setCancelDialogOpen(false)} className="order-cancel-dialog">
      <div className="order-dialog-actions">
        <Button type="button" variant="secondary" onClick={() => setCancelDialogOpen(false)} disabled={busy}>Volver</Button>
        <Button type="button" variant="danger" onClick={() => void confirmCancel()} disabled={busy}>{busy ? 'Cancelando…' : 'Confirmar cancelación'}</Button>
      </div>
    </Dialog>
  </div>;
}
