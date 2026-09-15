'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, Coins, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { confirmSellerOrder, getOrder, cancelOrder, openSellerOrderIssue, refreshOrderPaymentStatus } from '../infrastructure/api';
import { resumePaymentSession, uploadReceipt } from '@/features/checkout/infrastructure/api';
import { formatDate, formatMoney, statusLabel } from '@/shared/lib/format';
import { Button } from '@/components/button';
import { Dialog } from '@/components/overlay';

const mercadoPagoReturnParams = [
  'collection_id',
  'collection_status',
  'payment_id',
  'status',
  'external_reference',
  'payment_type',
  'merchant_order_id',
  'preference_id',
  'order_id',
  'site_id',
  'processing_mode',
  'merchant_account_id',
] as const;

export function OrderDetail({ number }: { number: string }) {
  const queryClient = useQueryClient();
  const paymentReturnRefreshKey = useRef<string | null>(null);
  const [pollingStopped, setPollingStopped] = useState(false);
  const query = useQuery({ queryKey: ['order', number], queryFn: () => getOrder(number), refetchInterval: (current) => !pollingStopped && ['PENDING_PAYMENT', 'PAYMENT_REVIEW'].includes(current.state.data?.status ?? '') ? 2000 : false, refetchIntervalInBackground: false });
  const [busy, setBusy] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [issueTarget, setIssueTarget] = useState<string | null>(null);
  const [issueReason, setIssueReason] = useState('');
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const paymentPending = ['PENDING_PAYMENT', 'PAYMENT_REVIEW'].includes(query.data?.status ?? '');
  const reconcilePaymentStatus = useCallback(async () => {
    await refreshOrderPaymentStatus(number);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['order', number], exact: true, refetchType: 'active' }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['loyalty-account'] }),
    ]);
  }, [number, queryClient]);
  useEffect(() => {
    if (!paymentPending || pollingStopped) return;
    const timer = window.setTimeout(() => setPollingStopped(true), 60_000);
    return () => window.clearTimeout(timer);
  }, [paymentPending, pollingStopped]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('payment');
    const isPaymentReturn = paymentResult === 'success' || paymentResult === 'pending' || paymentResult === 'failure';
    const hasMercadoPagoParams = mercadoPagoReturnParams.some((key) => params.has(key));
    if (!isPaymentReturn && !hasMercadoPagoParams) return;

    const refreshKey = `${number}?${params.toString()}`;
    if (paymentReturnRefreshKey.current === refreshKey) return;
    paymentReturnRefreshKey.current = refreshKey;

    void reconcilePaymentStatus()
      .catch((error) => toast.error(error instanceof Error ? error.message : 'No pudimos actualizar el estado del pago'));
  }, [number, reconcilePaymentStatus]);
  if (query.isLoading) return <div className="page-loading">Cargando orden…</div>;
  if (query.isError || !query.data) return <div className="empty-state"><h1>Orden no encontrada</h1><Link href="/account/orders" className="button button-secondary">Volver a mis órdenes</Link></div>;
  const order = query.data;
  const payment = order.payment;
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
  const confirmSellerDelivery = async (sellerOrderId: string, expectedVersion: number) => {
    setBusy(true);
    try { await confirmSellerOrder(order.number, sellerOrderId, expectedVersion); await query.refetch(); toast.success('Recepción confirmada'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo confirmar la recepción'); }
    finally { setBusy(false); }
  };
  const submitIssue = async () => {
    if (!issueTarget || issueReason.trim().length < 3) return;
    setBusy(true);
    try { await openSellerOrderIssue(order.number, issueTarget, issueReason.trim()); await query.refetch(); setIssueTarget(null); setIssueReason(''); toast.success('Reclamo abierto'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo abrir el reclamo'); }
    finally { setBusy(false); }
  };
  const resumeCheckout = async () => {
    setBusy(true);
    try {
      const result = await resumePaymentSession(order.number);
      if (!result.checkoutUrl) throw new Error('Mercado Pago todavía no devolvió una URL de checkout');
      const url = new URL(result.checkoutUrl);
      const hostname = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || !(hostname === 'mercadopago.com' || hostname.endsWith('.mercadopago.com') || hostname === 'mercadopago.com.ar' || hostname.endsWith('.mercadopago.com.ar'))) throw new Error('URL de pago no segura');
      window.location.assign(url.toString());
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo retomar el pago'); }
    finally { setBusy(false); }
  };
  const manuallyRefreshPaymentStatus = async () => {
    if (refreshingPayment) return;
    setRefreshingPayment(true);
    try {
      await reconcilePaymentStatus();
      setPollingStopped(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos actualizar el estado del pago');
    } finally {
      setRefreshingPayment(false);
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
        <p>{payment?.method === 'BANK_TRANSFER' ? `Transferencia · referencia ${payment.bankReference ?? 'pendiente'}` : `Mercado Pago · ${payment?.status ?? 'pendiente'}`}</p>
        {payment?.method === 'MERCADO_PAGO' && payment.mercadoPago?.amount && <div className="bank-details"><strong>Total cobrado en Mercado Pago</strong><span>{formatMoney(payment.mercadoPago.amount)}</span>{payment.mercadoPago.rate && <span>Cotización DólarAPI blue venta: {payment.mercadoPago.rate.rate}</span>}</div>}
        {payment?.method === 'MERCADO_PAGO' && ['PENDING_PAYMENT', 'PAYMENT_REVIEW'].includes(order.status) && ['READY', 'RETRY_REQUIRED'].includes(payment.paymentSessionStatus ?? '') && <Button variant="secondary" disabled={busy} onClick={() => void resumeCheckout()}>{payment.paymentSessionStatus === 'READY' ? 'Pagar con Mercado Pago' : 'Retomar pago con Mercado Pago'}</Button>}
        {payment?.method === 'MERCADO_PAGO' && !pollingStopped && <p className="form-hint">Confirmando el estado del pago…</p>}
        {payment?.method === 'MERCADO_PAGO' && pollingStopped && paymentPending && <div className="form-hint"><p>La confirmación está tardando más de lo esperado.</p><Button variant="ghost" disabled={refreshingPayment || query.isFetching} onClick={() => void manuallyRefreshPaymentStatus()}>{refreshingPayment ? 'Actualizando…' : 'Actualizar estado'}</Button></div>}
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
    {order.sellerOrders.length > 0 && <section className="order-card order-seller-orders"><div className="section-heading"><p className="eyebrow">Marketplace</p><h2>Entregas por vendedor</h2><p>La orden se actualiza automáticamente a partir de cada suborden.</p></div><div className="seller-order-cards">{order.sellerOrders.map((sellerOrder) => <article className="seller-order-card" key={sellerOrder.id}><div className="seller-order-card-header"><div><span className="eyebrow">{sellerOrder.sellerType === 'AFFILIATE' ? 'Afiliado' : 'Tienda'}</span><h3>{sellerOrder.sellerName}</h3><p>{sellerOrder.number} · {statusLabel(sellerOrder.status)}</p></div><span className="status-pill">{statusLabel(sellerOrder.status)}</span></div><div className="seller-order-card-content"><div><h4>Productos</h4>{sellerOrder.items.map((item) => <div className="summary-line" key={item.productId}><span>{item.name} × {item.quantity}</span><strong>{formatMoney(item.lineTotal)}</strong></div>)}</div><div><h4><Truck size={15} /> Entrega</h4>{sellerOrder.fulfillment.hidden ? <p>Los datos de entrega se habilitan cuando el pago esté acreditado.</p> : sellerOrder.fulfillmentType === 'SHIPMENT' ? <p>{sellerOrder.fulfillment.addressLine1}, {sellerOrder.fulfillment.city}, {sellerOrder.fulfillment.province}</p> : <p>{sellerOrder.fulfillment.pickupPointName}<br />{sellerOrder.fulfillment.pickupPointAddress}</p>}{sellerOrder.trackingCode && <p className="form-hint">Seguimiento: {sellerOrder.carrier ? `${sellerOrder.carrier} · ` : ''}{sellerOrder.trackingCode}</p>}</div></div>{sellerOrder.timeline.length > 0 && <ol className="order-timeline seller-order-timeline">{sellerOrder.timeline.map((event, index) => <li className={index === sellerOrder.timeline.length - 1 ? 'is-current' : ''} key={event.id}><span className="order-timeline-marker" aria-hidden="true" /><div><strong>{statusLabel(event.toStatus)}</strong><span>{formatDate(event.createdAt)}</span></div></li>)}</ol>}{sellerOrder.allowedActions.includes('CONFIRM_RECEIPT') && <Button variant="secondary" disabled={busy} onClick={() => void confirmSellerDelivery(sellerOrder.id, sellerOrder.version)}><CheckCircle2 size={16} />Confirmar recepción</Button>}{sellerOrder.allowedActions.includes('OPEN_ISSUE') && <Button variant="ghost" disabled={busy} onClick={() => { setIssueTarget(sellerOrder.id); setIssueReason(''); }}><AlertTriangle size={16} />Abrir reclamo</Button>}{sellerOrder.sellerContactPhone && <p className="form-hint">Contacto del vendedor: {sellerOrder.sellerContactPhone}</p>}</article>)}</div></section>}
    <Dialog open={cancelDialogOpen} title="Cancelar orden" description="Esta acción cancelará la orden y liberará las reservas asociadas. ¿Querés continuar?" onClose={() => !busy && setCancelDialogOpen(false)} className="order-cancel-dialog">
      <div className="order-dialog-actions">
        <Button type="button" variant="secondary" onClick={() => setCancelDialogOpen(false)} disabled={busy}>Volver</Button>
        <Button type="button" variant="danger" onClick={() => void confirmCancel()} disabled={busy}>{busy ? 'Cancelando…' : 'Confirmar cancelación'}</Button>
      </div>
    </Dialog>
    <Dialog open={Boolean(issueTarget)} title="Abrir reclamo" description="Contanos qué ocurrió con la entrega. El vendedor y la administración recibirán el aviso." onClose={() => !busy && setIssueTarget(null)}>
      <form className="order-dialog-actions" onSubmit={(event) => { event.preventDefault(); void submitIssue(); }}><label className="form-field"><span>Motivo</span><textarea value={issueReason} onChange={(event) => setIssueReason(event.target.value)} minLength={3} maxLength={1000} rows={5} placeholder="Describí el problema con la entrega" required /></label><Button type="button" variant="secondary" onClick={() => setIssueTarget(null)} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy || issueReason.trim().length < 3}>{busy ? 'Enviando…' : 'Abrir reclamo'}</Button></form>
    </Dialog>
  </div>;
}
