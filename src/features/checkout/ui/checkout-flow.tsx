'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { toast } from '@/components/feedback';
import { useCartStore } from '@/features/cart/infrastructure/store';
import { cartTotal } from '@/features/cart/domain/cart';
import { getProduct } from '@/features/catalog/infrastructure/api';
import { formatMoney } from '@/shared/lib/format';
import { BASE_CURRENCY } from '@/shared/lib/currency';
import { Button } from '@/components/button';
import { getCheckoutOptions, previewCheckout, createOrder } from '../infrastructure/api';
import { getMe } from '@/features/auth/infrastructure/api';
import { getLoyaltyAccount } from '@/features/loyalty';
import type { CheckoutPreview, OrderInput } from '@/shared/api/contracts';
import styles from './checkout-flow.module.css';

type SellerDeliverySelection = { delivery: 'PICKUP' | 'SHIPMENT'; pickupPointId?: string; shippingRateId?: string };

export function CheckoutFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const replaceProduct = useCartStore((state) => state.replaceProduct);
  const syncedProductIds = useRef(new Set<string>());
  const [syncingCart, setSyncingCart] = useState(false);
  const me = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const options = useQuery({ queryKey: ['checkout-options', items.map((item) => `${item.id}:${item.productVersion}`).join(',')], queryFn: () => getCheckoutOptions(items.map((item) => ({ productId: item.id, quantity: item.quantity, productVersion: item.productVersion }))) });
  const loyalty = useQuery({ queryKey: ['loyalty-account', 'summary'], queryFn: () => getLoyaltyAccount(), enabled: Boolean(me.data), retry: false });
  const [delivery, setDelivery] = useState<'PICKUP' | 'SHIPMENT'>('PICKUP');
  const [pickupPointId, setPickupPointId] = useState('');
  const [shippingRateId, setShippingRateId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'MERCADO_PAGO'>('BANK_TRANSFER');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '', addressLine1: '', addressLine2: '', city: '', province: '', postalCode: '' });
  const [sellerSelections, setSellerSelections] = useState<Record<string, SellerDeliverySelection>>({});
  const [quote, setQuote] = useState<CheckoutPreview>();
  const [busy, setBusy] = useState(false);
  const checkoutKey = useRef<string | null>(null);
  const checkoutKeyPayload = useRef<string | null>(null);

  useEffect(() => {
    const pendingItems = items.filter((item) => !syncedProductIds.current.has(item.id));
    if (!pendingItems.length) {
      setSyncingCart(false);
      return;
    }

    let active = true;
    pendingItems.forEach((item) => syncedProductIds.current.add(item.id));
    setSyncingCart(true);

    void Promise.allSettled(pendingItems.map((item) => getProduct(item.slug))).then((results) => {
      if (!active) return;
      results.forEach((result) => {
        if (result.status === 'fulfilled') replaceProduct(result.value);
      });
    }).finally(() => {
      if (active) setSyncingCart(false);
    });

    return () => {
      active = false;
    };
  }, [items, replaceProduct]);

  const sellerOptions = useMemo(() => options.data?.sellers ?? [], [options.data?.sellers]);

  const effectivePaymentMethod = !options.data?.paymentMethods.BANK_TRANSFER && options.data?.paymentMethods.MERCADO_PAGO ? 'MERCADO_PAGO' : paymentMethod;
  const input = useMemo<OrderInput | null>(() => {
    if (!items.length) return null;
    const buildFulfillment = (selection: SellerDeliverySelection | undefined, seller?: typeof sellerOptions[number]): OrderInput['fulfillment'] | null => {
      const selectedDelivery = selection?.delivery ?? delivery;
      if (selectedDelivery === 'PICKUP') {
        const selectedPickupPointId = selection?.pickupPointId ?? pickupPointId ?? seller?.pickupPoints[0]?.id;
        return selectedPickupPointId ? { type: 'PICKUP', pickupPointId: selectedPickupPointId } : null;
      }
      const selectedShippingRateId = selection?.shippingRateId ?? shippingRateId ?? seller?.shippingZones[0]?.rates[0]?.id;
      if (!selectedShippingRateId || !form.recipientName || !form.recipientPhone || !form.addressLine1 || !form.city || !form.province || !form.postalCode) return null;
      return { type: 'SHIPMENT', shippingRateId: selectedShippingRateId, ...form };
    };
    const primarySeller = sellerOptions[0];
    const primaryFulfillment = buildFulfillment(sellerOptions.length > 1 && primarySeller ? sellerSelections[primarySeller.sellerKey] : undefined, primarySeller);
    if (!primaryFulfillment) return null;
    const sellerFulfillments = sellerOptions.length > 1 ? sellerOptions.map((seller) => ({ sellerKey: seller.sellerKey, fulfillment: buildFulfillment(sellerSelections[seller.sellerKey], seller) })).filter((entry): entry is { sellerKey: string; fulfillment: NonNullable<ReturnType<typeof buildFulfillment>> } => Boolean(entry.fulfillment)) : [];
    if (sellerOptions.length > 1 && sellerFulfillments.length !== sellerOptions.length) return null;
    return {
      items: items.map((item) => ({ productId: item.id, quantity: item.quantity, productVersion: item.productVersion })),
      fulfillment: primaryFulfillment,
      ...(sellerFulfillments ? { sellerFulfillments } : {}),
      paymentMethod: effectivePaymentMethod,
      pointsToRedeem,
    };
  }, [items, delivery, pickupPointId, shippingRateId, form, effectivePaymentMethod, pointsToRedeem, sellerOptions, sellerSelections]);

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
      const orderInput: OrderInput = quote?.mercadoPago ? { ...input, rateSnapshotId: quote.mercadoPago.rateSnapshotId } : input;
      const payloadKey = JSON.stringify(orderInput);
      if (checkoutKeyPayload.current !== payloadKey || !checkoutKey.current) {
        checkoutKey.current = `bcs-${crypto.randomUUID()}`;
        checkoutKeyPayload.current = payloadKey;
      }
      const result = await createOrder(orderInput, checkoutKey.current);
      await queryClient.invalidateQueries({ queryKey: ['loyalty-account'] });
      const checkoutUrl = result.order.payment && typeof result.order.payment.checkoutUrl === 'string' ? result.order.payment.checkoutUrl : null;
      if (result.order.paymentMethod === 'MERCADO_PAGO' && checkoutUrl) {
        const url = new URL(checkoutUrl);
        const hostname = url.hostname.toLowerCase();
        if (url.protocol !== 'https:' || !(hostname === 'mercadopago.com' || hostname.endsWith('.mercadopago.com') || hostname === 'mercadopago.com.ar' || hostname.endsWith('.mercadopago.com.ar'))) throw new Error('URL de pago no segura');
        clear();
        window.location.assign(url.toString());
        return;
      }
      clear();
      router.push(`/account/orders/${result.order.number}?created=1`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No pudimos crear la orden'); }
    finally { setBusy(false); }
  };

  if (me.isLoading || options.isLoading) return <div className="page-loading">Cargando opciones de compra…</div>;
  if (!me.data) return <div className="empty-state"><h2>Iniciá sesión para continuar</h2><p>Necesitamos una cuenta verificada para reservar tu compra.</p><Link href="/auth/login?returnTo=/checkout" className="button button-primary">Ingresar</Link></div>;
  if (!me.data.emailVerified) return <div className="empty-state"><h2>Verificá tu email</h2><p>Revisá tu correo y luego volvé a intentar el checkout.</p><Link href="/auth/verify-email" className="button button-secondary">Verificar email</Link></div>;
  if (!items.length) return <div className="empty-state"><h2>Tu carrito está vacío</h2><Link href="/catalog" className="button button-primary">Explorar catálogo</Link></div>;

  return (
    <div className={`${styles.checkoutLayout} checkout-layout`}>
      <div className={`${styles.checkoutMain} checkout-main`}>
        <div className={`${styles.checkoutHeading} section-heading checkout-heading`}>
          <p className="eyebrow">Paso final · Compra segura</p>
          <h1>Confirmá tu compra</h1>
          <p>Revisá la entrega, elegí cómo pagar y confirmá. El total, el stock y tus puntos se validan nuevamente en el servidor.</p>
          <div className={`${styles.checkoutProgress} checkout-progress`} aria-label="Progreso del checkout">
            <span className={`${styles.isActive} is-active`}>1 Entrega</span>
            <span className={`${styles.isActive} is-active`}>2 Pago</span>
            <span>3 Confirmación</span>
          </div>
        </div>

        {sellerOptions.length > 1 && (
          <section className={`${styles.checkoutSection} ${styles.sellerDeliveryGroups} checkout-section checkout-delivery-section seller-delivery-groups`}>
            <h2>1. Entrega por vendedor</h2>
            <p className="form-hint">Elegí una opción independiente para cada vendedor. La dirección se comparte entre los envíos.</p>
            {sellerOptions.map((seller) => {
              const selection = sellerSelections[seller.sellerKey] ?? { delivery: seller.pickupPoints.length ? 'PICKUP' : 'SHIPMENT' };
              return (
                <div className={`${styles.sellerDeliveryGroup} seller-delivery-group`} key={seller.sellerKey}>
                  <h3>{seller.seller.name}</h3>
                  <div className={`${styles.segmented} segmented`}>
                    <button
                      type="button"
                      className={selection.delivery === 'PICKUP' ? 'active' : ''}
                      disabled={!seller.pickupPoints.length}
                      onClick={() => {
                        setSellerSelections((current) => ({ ...current, [seller.sellerKey]: { ...selection, delivery: 'PICKUP', pickupPointId: selection.pickupPointId ?? seller.pickupPoints[0]?.id } }));
                        resetQuote();
                      }}
                    >
                      Retiro
                    </button>
                    <button
                      type="button"
                      className={selection.delivery === 'SHIPMENT' ? 'active' : ''}
                      disabled={!seller.shippingZones.some((zone) => zone.rates.length)}
                      onClick={() => {
                        setSellerSelections((current) => ({ ...current, [seller.sellerKey]: { ...selection, delivery: 'SHIPMENT', shippingRateId: selection.shippingRateId ?? seller.shippingZones[0]?.rates[0]?.id } }));
                        resetQuote();
                      }}
                    >
                      Envío
                    </button>
                  </div>
                  {selection.delivery === 'PICKUP' ? (
                    <label>
                      Punto de retiro
                      <select
                        value={selection.pickupPointId ?? ''}
                        onChange={(event) => {
                          setSellerSelections((current) => ({ ...current, [seller.sellerKey]: { ...selection, pickupPointId: event.target.value } }));
                          resetQuote();
                        }}
                      >
                        <option value="">Elegí un punto</option>
                        {seller.pickupPoints.map((point) => (
                          <option key={point.id} value={point.id}>
                            {point.name} · {point.address}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      Tarifa de envío
                      <select
                        value={selection.shippingRateId ?? ''}
                        onChange={(event) => {
                          setSellerSelections((current) => ({ ...current, [seller.sellerKey]: { ...selection, shippingRateId: event.target.value } }));
                          resetQuote();
                        }}
                      >
                        <option value="">Elegí una tarifa</option>
                        {seller.shippingZones.flatMap((zone) =>
                          zone.rates.map((rate) => (
                            <option key={rate.id} value={rate.id}>
                              {zone.name} · {rate.name} · {formatMoney(rate.price)}
                            </option>
                          )),
                        )}
                      </select>
                    </label>
                  )}
                </div>
              );
            })}
            <div className={`${styles.formGrid} form-grid`}>
              {[
                ['recipientName', 'Nombre completo'],
                ['recipientPhone', 'Teléfono'],
                ['addressLine1', 'Dirección'],
                ['addressLine2', 'Piso/departamento (opcional)'],
                ['city', 'Ciudad'],
                ['province', 'Provincia'],
                ['postalCode', 'Código postal'],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input value={form[key as keyof typeof form]} onChange={update(key as keyof typeof form)} />
                </label>
              ))}
            </div>
          </section>
        )}

        <section className={`${styles.checkoutSection} checkout-section checkout-delivery-section`} style={sellerOptions.length > 1 ? { display: 'none' } : undefined}>
          <h2>1. Entrega</h2>
          <div className={`${styles.segmented} segmented`}>
            <button
              type="button"
              className={delivery === 'PICKUP' ? 'active' : ''}
              onClick={() => {
                setDelivery('PICKUP');
                resetQuote();
              }}
            >
              Retiro
            </button>
            <button
              type="button"
              className={delivery === 'SHIPMENT' ? 'active' : ''}
              onClick={() => {
                setDelivery('SHIPMENT');
                resetQuote();
              }}
            >
              Envío
            </button>
          </div>
          {delivery === 'PICKUP' ? (
            <label>
              Punto de retiro
              <select
                value={pickupPointId}
                onChange={(event) => {
                  setPickupPointId(event.target.value);
                  resetQuote();
                }}
              >
                <option value="">Elegí un punto</option>
                {options.data?.fulfillment.pickupPoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.name} · {point.address}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                Tarifa de envío
                <select
                  value={shippingRateId}
                  onChange={(event) => {
                    setShippingRateId(event.target.value);
                    resetQuote();
                  }}
                >
                  <option value="">Elegí una tarifa</option>
                  {options.data?.fulfillment.shippingZones.flatMap((zone) =>
                    zone.rates.map((rate) => (
                      <option key={rate.id} value={rate.id}>
                        {zone.name} · {rate.name} · {formatMoney(rate.price)}
                      </option>
                    )),
                  )}
                </select>
              </label>
              <div className={`${styles.formGrid} form-grid`}>
                {[
                  ['recipientName', 'Nombre completo'],
                  ['recipientPhone', 'Teléfono'],
                  ['addressLine1', 'Dirección'],
                  ['addressLine2', 'Piso/departamento (opcional)'],
                  ['city', 'Ciudad'],
                  ['province', 'Provincia'],
                  ['postalCode', 'Código postal'],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input value={form[key as keyof typeof form]} onChange={update(key as keyof typeof form)} />
                  </label>
                ))}
              </div>
            </>
          )}
        </section>

        <section className={`${styles.checkoutSection} checkout-section checkout-payment-section`}>
          <h2>2. Medio de pago</h2>
          <p className={`${styles.checkoutSectionIntro} checkout-section-intro`}>
            Elegí una opción. Si seleccionás Mercado Pago, te llevaremos a su checkout seguro para completar el pago.
          </p>
          <div className={`${styles.paymentOptions} payment-options`}>
            {options.data?.paymentMethods.BANK_TRANSFER && (
              <label className={`${styles.paymentOption} ${paymentMethod === 'BANK_TRANSFER' ? `${styles.selected} selected` : ''} payment-option`}>
                <input
                  type="radio"
                  checked={paymentMethod === 'BANK_TRANSFER'}
                  onChange={() => {
                    setPaymentMethod('BANK_TRANSFER');
                    resetQuote();
                  }}
                />
                <span>
                  <strong>Transferencia bancaria</strong>
                  <small>Recibí los datos después de crear la orden.</small>
                </span>
              </label>
            )}
            {options.data?.paymentMethods.MERCADO_PAGO && (
              <label className={`${styles.paymentOption} ${paymentMethod === 'MERCADO_PAGO' ? `${styles.selected} selected` : ''} payment-option`}>
                <input
                  type="radio"
                  checked={paymentMethod === 'MERCADO_PAGO'}
                  onChange={() => {
                    setPaymentMethod('MERCADO_PAGO');
                    resetQuote();
                  }}
                />
                <span>
                  <strong>Mercado Pago</strong>
                  <small>Tarjetas, débito, saldo y checkout seguro del proveedor.</small>
                </span>
              </label>
            )}
            {!options.data?.paymentMethods.MERCADO_PAGO && options.data?.paymentMethodUnavailableReasons?.MERCADO_PAGO && (
              <p className="form-hint">Mercado Pago no está disponible temporalmente; podés continuar con transferencia.</p>
            )}
            {!options.data?.paymentMethods.BANK_TRANSFER && !options.data?.paymentMethods.MERCADO_PAGO && (
              <p className={`${styles.checkoutPaymentEmpty} form-hint checkout-payment-empty`}>
                No hay medios de pago disponibles en este momento. Intentá nuevamente más tarde.
              </p>
            )}
          </div>
        </section>

        <section className={`${styles.checkoutSection} ${styles.loyaltyCheckout} checkout-section loyalty-checkout`}>
          <div className={`${styles.loyaltyCheckoutTitle} loyalty-checkout-title`}>
            <div className={`${styles.loyaltyIcon} loyalty-icon`}>
              <Coins size={21} />
            </div>
            <div>
              <h2>3. Usar puntos</h2>
              <p>{account ? `${account.available} puntos disponibles` : 'Consultando saldo…'}</p>
            </div>
          </div>
          {program?.enabled ? (
            <>
              <div className={`${styles.loyaltyRedeemControl} loyalty-redeem-control`}>
                <label htmlFor="points-to-redeem">
                  Puntos a canjear
                  <input
                    id="points-to-redeem"
                    type="number"
                    min="0"
                    max={estimatedMaxPoints}
                    step="1"
                    inputMode="numeric"
                    value={pointsToRedeem}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setPointsToRedeem(Number.isInteger(value) && value >= 0 ? value : 0);
                      resetQuote();
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={estimatedMaxPoints < program.minimumRedemptionPoints}
                  onClick={() => {
                    setPointsToRedeem(estimatedMaxPoints);
                    resetQuote();
                  }}
                >
                  Usar máximo
                </button>
              </div>
              <p className="form-hint">
                Canje mínimo: {program.minimumRedemptionPoints} puntos. Cada punto descuenta {formatMoney(program.pointValue)} y podés cubrir hasta el{' '}
                {program.maximumRedemptionPercent}% de los productos.{' '}
                {syncingCart ? 'Actualizando precios…' : `Máximo para esta compra: ${estimatedMaxPoints} puntos.`}
              </p>
              {pointsBelowMinimum && <p className={`${styles.loyaltyInlineError} loyalty-inline-error`}>Necesitás al menos {program.minimumRedemptionPoints} puntos para canjear.</p>}
              {pointsAboveMaximum && <p className={`${styles.loyaltyInlineError} loyalty-inline-error`}>Podés usar hasta {estimatedMaxPoints} puntos en esta compra.</p>}
            </>
          ) : (
            <p className="form-hint">El programa de puntos está temporalmente pausado. Tu saldo se conserva.</p>
          )}
        </section>
      </div>

      <aside className={`${styles.checkoutSummary} checkout-summary`}>
        <div className={`${styles.checkoutSummaryHeader} checkout-summary-header`}>
          <div>
            <p className="eyebrow">Revisión final</p>
            <h2>Resumen</h2>
          </div>
          <span className={`${styles.checkoutSummaryCount} checkout-summary-count`}>
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
          </span>
        </div>
        <div className={`${styles.checkoutSummaryDetails} checkout-summary-details`}>
          {items.map((item) => (
            <div className="summary-line" key={item.id}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <strong>{formatMoney({ amountMinor: (BigInt(item.price.amountMinor) * BigInt(item.quantity)).toString(), currency: BASE_CURRENCY })}</strong>
            </div>
          ))}
          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{quote ? formatMoney(quote.subtotal) : formatMoney({ amountMinor: cartTotal(items).toString(), currency: BASE_CURRENCY })}</strong>
          </div>
          {quote && BigInt(quote.discount.amountMinor) > 0n && (
            <div className={`summary-line ${styles.loyaltyDiscount} loyalty-discount`}>
              <span>Descuento por puntos</span>
              <strong>−{formatMoney(quote.discount)}</strong>
            </div>
          )}
          {quote && (
            <div className="summary-line">
              <span>Envío</span>
              <strong>{formatMoney(quote.shipping)}</strong>
            </div>
          )}
        </div>
        <div className="summary-total">
          <span>Total USD</span>
          <strong className={!quote ? `${styles.summaryPending} summary-pending` : undefined}>
            {quote ? formatMoney(quote.total) : 'Validá para calcular'}
          </strong>
        </div>
        {quote?.mercadoPago && (
          <div className={`${styles.paymentQuote} payment-quote`}>
            <div className="summary-line">
              <span>Total a pagar en ARS</span>
              <strong>{formatMoney(quote.mercadoPago.total)}</strong>
            </div>
            <p className="form-hint">
              DólarAPI blue venta: {quote.mercadoPago.rate} · obtenido {new Date(quote.mercadoPago.fetchedAt).toLocaleTimeString()} · vigente hasta{' '}
              {new Date(quote.mercadoPago.expiresAt).toLocaleTimeString()}
            </p>
          </div>
        )}
        {quote && (
          <div className={`${styles.loyaltyEarnNote} loyalty-earn-note`}>
            <Coins size={17} />
            <span>
              Esta compra sumará <strong>{quote.loyalty.pointsToEarn} puntos</strong> cuando se acredite el pago.
            </span>
          </div>
        )}
        <Button
          disabled={
            !input ||
            syncingCart ||
            busy ||
            pointsBelowMinimum ||
            pointsAboveMaximum ||
            (!options.data?.paymentMethods.BANK_TRANSFER && !options.data?.paymentMethods.MERCADO_PAGO)
          }
          onClick={quote ? submit : quoteIt}
        >
          {syncingCart ? 'Actualizando precios…' : busy ? 'Validando…' : quote ? 'Crear orden' : 'Validar total'}
        </Button>
        <p className={`${styles.checkoutSummaryHint} form-hint checkout-summary-hint`}>
          El precio y el saldo mostrado son informativos hasta la validación final.
        </p>
      </aside>
    </div>
  );
}
