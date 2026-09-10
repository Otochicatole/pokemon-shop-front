'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/features/cart/infrastructure/store';
import { cartTotal } from '@/features/cart/domain/cart';
import { formatMoney } from '@/shared/lib/format';
import { Button } from '@/components/button';
import { getCheckoutOptions, previewCheckout, createOrder } from '../infrastructure/api';
import { getMe } from '@/features/auth/infrastructure/api';
import { getLoyaltyAccount } from '@/features/loyalty';
import type { CheckoutPreview, OrderInput } from '@/shared/api/contracts';

export function CheckoutFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const me = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const options = useQuery({ queryKey: ['checkout-options'], queryFn: getCheckoutOptions });
  const loyalty = useQuery({ queryKey: ['loyalty-account', 'summary'], queryFn: () => getLoyaltyAccount(), enabled: Boolean(me.data), retry: false });
  const [delivery, setDelivery] = useState<'PICKUP' | 'SHIPMENT'>('PICKUP');
  const [pickupPointId, setPickupPointId] = useState('');
  const [shippingRateId, setShippingRateId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'MERCADO_PAGO'>('BANK_TRANSFER');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '', addressLine1: '', addressLine2: '', city: '', province: '', postalCode: '' });
  const [quote, setQuote] = useState<CheckoutPreview>();
  const [busy, setBusy] = useState(false);

  const effectivePaymentMethod = !options.data?.paymentMethods.BANK_TRANSFER && options.data?.paymentMethods.MERCADO_PAGO ? 'MERCADO_PAGO' : paymentMethod;
  const input = useMemo<OrderInput | null>(() => {
    if (!items.length) return null;
    if (delivery === 'PICKUP' && !pickupPointId) return null;
    if (delivery === 'SHIPMENT' && (!shippingRateId || !form.recipientName || !form.recipientPhone || !form.addressLine1 || !form.city || !form.province || !form.postalCode)) return null;
    return {
      items: items.map((item) => ({ productId: item.id, quantity: item.quantity, productVersion: item.productVersion })),
      fulfillment: delivery === 'PICKUP' ? { type: 'PICKUP', pickupPointId } : { type: 'SHIPMENT', shippingRateId, ...form },
      paymentMethod: effectivePaymentMethod,
      pointsToRedeem,
    };
  }, [items, delivery, pickupPointId, shippingRateId, form, effectivePaymentMethod, pointsToRedeem]);

  const program = loyalty.data?.program;
  const account = loyalty.data?.account;
  const estimatedMaxPoints = useMemo(() => {
    if (!program?.enabled || !account) return 0;
    const subtotal = cartTotal(items);
    const cap = subtotal * BigInt(program.maximumRedemptionPercent) / 100n;
    const byMoney = Number(cap / BigInt(program.pointValue.amountMinor));
    return Math.max(0, Math.min(account.available, byMoney));
  }, [account, items, program]);
  const pointsBelowMinimum = pointsToRedeem > 0 && pointsToRedeem < (program?.minimumRedemptionPoints ?? 0);
  const pointsAboveMaximum = pointsToRedeem > estimatedMaxPoints;

  const resetQuote = () => setQuote(undefined);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    resetQuote();
  };
  const quoteIt = async () => {
    if (!input) return;
    setBusy(true);
    try { setQuote(await previewCheckout(input)); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'No pudimos validar tu compra'); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!input) return;
    setBusy(true);
    try {
      const result = await createOrder(input, `bcs-${crypto.randomUUID()}`);
      clear();
      await queryClient.invalidateQueries({ queryKey: ['loyalty-account'] });
      const checkoutUrl = result.order.payment && typeof result.order.payment.checkoutUrl === 'string' ? result.order.payment.checkoutUrl : null;
      if (result.order.paymentMethod === 'MERCADO_PAGO' && checkoutUrl) {
        const url = new URL(checkoutUrl);
        if (url.protocol !== 'https:') throw new Error('URL de pago no segura');
        window.location.assign(url.toString());
        return;
      }
      router.push(`/account/orders/${result.order.number}?created=1`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No pudimos crear la orden'); }
    finally { setBusy(false); }
  };

  if (me.isLoading || options.isLoading) return <div className="page-loading">Cargando opciones de compra…</div>;
  if (!me.data) return <div className="empty-state"><h2>Iniciá sesión para continuar</h2><p>Necesitamos una cuenta verificada para reservar tu compra.</p><Link href="/auth/login?returnTo=/checkout" className="button button-primary">Ingresar</Link></div>;
  if (!me.data.emailVerified) return <div className="empty-state"><h2>Verificá tu email</h2><p>Revisá tu correo y luego volvé a intentar el checkout.</p><Link href="/auth/verify-email" className="button button-secondary">Verificar email</Link></div>;
  if (!items.length) return <div className="empty-state"><h2>Tu carrito está vacío</h2><Link href="/catalog" className="button button-primary">Explorar catálogo</Link></div>;

  return <div className="checkout-layout"><div className="checkout-main"><div className="section-heading"><p className="eyebrow">Paso final</p><h1>Confirmá tu compra</h1><p>El total, el stock y tus puntos se validan nuevamente en el servidor.</p></div>
    <section className="checkout-section"><h2>1. Entrega</h2><div className="segmented"><button type="button" className={delivery === 'PICKUP' ? 'active' : ''} onClick={() => { setDelivery('PICKUP'); resetQuote(); }}>Retiro</button><button type="button" className={delivery === 'SHIPMENT' ? 'active' : ''} onClick={() => { setDelivery('SHIPMENT'); resetQuote(); }}>Envío</button></div>{delivery === 'PICKUP' ? <label>Punto de retiro<select value={pickupPointId} onChange={(event) => { setPickupPointId(event.target.value); resetQuote(); }}><option value="">Elegí un punto</option>{options.data?.fulfillment.pickupPoints.map((point) => <option key={point.id} value={point.id}>{point.name} · {point.address}</option>)}</select></label> : <><label>Tarifa de envío<select value={shippingRateId} onChange={(event) => { setShippingRateId(event.target.value); resetQuote(); }}><option value="">Elegí una tarifa</option>{options.data?.fulfillment.shippingZones.flatMap((zone) => zone.rates.map((rate) => <option key={rate.id} value={rate.id}>{zone.name} · {rate.name} · {formatMoney(rate.price)}</option>))}</select></label><div className="form-grid">{[['recipientName','Nombre completo'],['recipientPhone','Teléfono'],['addressLine1','Dirección'],['addressLine2','Piso/departamento (opcional)'],['city','Ciudad'],['province','Provincia'],['postalCode','Código postal']].map(([key,label]) => <label key={key}>{label}<input value={form[key as keyof typeof form]} onChange={update(key as keyof typeof form)} /></label>)}</div></>}</section>
    <section className="checkout-section"><h2>2. Medio de pago</h2><div className="payment-options">{options.data?.paymentMethods.BANK_TRANSFER && <label className={`payment-option ${paymentMethod === 'BANK_TRANSFER' ? 'selected' : ''}`}><input type="radio" checked={paymentMethod === 'BANK_TRANSFER'} onChange={() => { setPaymentMethod('BANK_TRANSFER'); resetQuote(); }} /> <span><strong>Transferencia bancaria</strong><small>Recibí los datos después de crear la orden.</small></span></label>}{options.data?.paymentMethods.MERCADO_PAGO && <label className={`payment-option ${paymentMethod === 'MERCADO_PAGO' ? 'selected' : ''}`}><input type="radio" checked={paymentMethod === 'MERCADO_PAGO'} onChange={() => { setPaymentMethod('MERCADO_PAGO'); resetQuote(); }} /> <span><strong>Mercado Pago</strong><small>Checkout seguro del proveedor.</small></span></label>}</div></section>
    <section className="checkout-section loyalty-checkout"><div className="loyalty-checkout-title"><div className="loyalty-icon"><Coins size={21} /></div><div><h2>3. Usar puntos</h2><p>{account ? `${account.available} puntos disponibles` : 'Consultando saldo…'}</p></div></div>{program?.enabled ? <><div className="loyalty-redeem-control"><label htmlFor="points-to-redeem">Puntos a canjear<input id="points-to-redeem" type="number" min="0" max={estimatedMaxPoints} step="1" inputMode="numeric" value={pointsToRedeem} onChange={(event) => { const value = Number(event.target.value); setPointsToRedeem(Number.isInteger(value) && value >= 0 ? value : 0); resetQuote(); }} /></label><button type="button" disabled={estimatedMaxPoints < program.minimumRedemptionPoints} onClick={() => { setPointsToRedeem(estimatedMaxPoints); resetQuote(); }}>Usar máximo</button></div><p className="form-hint">Canje mínimo: {program.minimumRedemptionPoints} puntos. Cada punto descuenta {formatMoney(program.pointValue)} y podés cubrir hasta el {program.maximumRedemptionPercent}% de los productos.</p>{pointsBelowMinimum && <p className="loyalty-inline-error">Necesitás al menos {program.minimumRedemptionPoints} puntos para canjear.</p>}{pointsAboveMaximum && <p className="loyalty-inline-error">Podés usar hasta {estimatedMaxPoints} puntos en esta compra.</p>}</> : <p className="form-hint">El programa de puntos está temporalmente pausado. Tu saldo se conserva.</p>}</section>
  </div><aside className="checkout-summary"><h2>Resumen</h2>{items.map((item) => <div className="summary-line" key={item.id}><span>{item.name} × {item.quantity}</span><strong>{formatMoney({ amountMinor: (BigInt(item.price.amountMinor) * BigInt(item.quantity)).toString(), currency: 'ARS' })}</strong></div>)}<div className="summary-line"><span>Subtotal</span><strong>{quote ? formatMoney(quote.subtotal) : formatMoney({ amountMinor: cartTotal(items).toString(), currency: 'ARS' })}</strong></div>{quote && BigInt(quote.discount.amountMinor) > 0n && <div className="summary-line loyalty-discount"><span>Descuento por puntos</span><strong>−{formatMoney(quote.discount)}</strong></div>}{quote && <div className="summary-line"><span>Envío</span><strong>{formatMoney(quote.shipping)}</strong></div>}<div className="summary-total"><span>Total</span><strong>{quote ? formatMoney(quote.total) : 'Se calcula al validar'}</strong></div>{quote && <div className="loyalty-earn-note"><Coins size={17} /><span>Esta compra sumará <strong>{quote.loyalty.pointsToEarn} puntos</strong> cuando se acredite el pago.</span></div>}<Button disabled={!input || busy || pointsBelowMinimum || pointsAboveMaximum || (!options.data?.paymentMethods.BANK_TRANSFER && !options.data?.paymentMethods.MERCADO_PAGO)} onClick={quote ? submit : quoteIt}>{busy ? 'Validando…' : quote ? 'Crear orden' : 'Validar total'}</Button><p className="form-hint">El precio y el saldo mostrado son informativos hasta la validación final.</p></aside></div>;
}
