'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { toast } from '@/components/feedback';
import { useCartStore } from '@/features/cart/infrastructure/store';
import { cartTotal, storeCartTotal } from '@/features/cart/domain/cart';
import { getProduct } from '@/features/catalog/infrastructure/api';
import { formatMoney as formatRawMoney } from '@/shared/lib/format';
import { useStorefrontFx } from '@/shared/fx/StorefrontFxProvider';
import { BASE_CURRENCY } from '@/shared/lib/currency';
import { Button } from '@/components/button';
import { getCheckoutOptions, previewCheckout, createOrder } from '../infrastructure/api';
import { getMe } from '@/features/auth/infrastructure/api';
import { getLoyaltyAccount } from '@/features/loyalty';
import { ApiError } from '@/shared/api/client';
import type { CheckoutPreview, Money, OrderInput, ProviderMoney } from '@/shared/api/contracts';
import styles from './checkout-flow.module.css';

type SellerDeliverySelection = { delivery: 'PICKUP' | 'SHIPMENT'; pickupPointId?: string; shippingRateId?: string };
type ShippingZoneOption = { id: string; name: string; provinces: string[]; rates: Array<{ id: string; name: string; price: { amountMinor: string; currency: typeof BASE_CURRENCY } }> };

function estimateMaxRedeemablePoints(
  available: number,
  storeSubtotalMinor: bigint,
  pointValueMinor: bigint,
  maximumRedemptionPercent: number,
) {
  if (pointValueMinor <= 0n) return 0;
  const cap = storeSubtotalMinor * BigInt(maximumRedemptionPercent) / 100n;
  const byMoney = Number(cap / pointValueMinor);
  return Math.max(0, Math.min(available, byMoney));
}

function provincesFromZones(zones: ShippingZoneOption[]) {
  return [...new Set(zones.flatMap((zone) => zone.provinces))].sort((left, right) => left.localeCompare(right, 'es'));
}

function ratesForProvince(zones: ShippingZoneOption[], province: string) {
  const normalized = province.trim().toLowerCase();
  if (!normalized) return [];
  return zones
    .filter((zone) => zone.provinces.some((entry) => entry.toLowerCase() === normalized))
    .flatMap((zone) => zone.rates.map((rate) => ({ zone, rate })));
}

export function CheckoutFlow() {
  const fx = useStorefrontFx();
  const formatMoney = (money?: Money | ProviderMoney) => {
    if (!money) return '—';
    if (money.currency === 'ARS') return formatRawMoney(money);
    return fx.formatMoney(money);
  };
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
  const shippingZones = useMemo(
    () => (options.data?.fulfillment.shippingZones ?? []) as ShippingZoneOption[],
    [options.data?.fulfillment.shippingZones],
  );
  const availableProvinces = useMemo(() => provincesFromZones(shippingZones), [shippingZones]);
  const ratesForSelectedProvince = useMemo(
    () => ratesForProvince(shippingZones, form.province),
    [shippingZones, form.province],
  );

  useEffect(() => {
    if (!shippingRateId) return;
    if (ratesForSelectedProvince.some(({ rate }) => rate.id === shippingRateId)) return;
    setShippingRateId('');
    setQuote(undefined);
  }, [ratesForSelectedProvince, shippingRateId]);

  const effectivePaymentMethod = !options.data?.paymentMethods.BANK_TRANSFER && options.data?.paymentMethods.MERCADO_PAGO ? 'MERCADO_PAGO' : paymentMethod;
  const input = useMemo<OrderInput | null>(() => {
    if (!items.length) return null;
    const buildFulfillment = (selection: SellerDeliverySelection | undefined, seller?: typeof sellerOptions[number]): OrderInput['fulfillment'] | null => {
      const selectedDelivery = selection?.delivery ?? delivery;
      if (selectedDelivery === 'PICKUP') {
        const selectedPickupPointId = selection?.pickupPointId ?? pickupPointId ?? seller?.pickupPoints[0]?.id;
        return selectedPickupPointId ? { type: 'PICKUP', pickupPointId: selectedPickupPointId } : null;
      }
      const zones = (seller?.shippingZones ?? shippingZones) as ShippingZoneOption[];
      const matchingRates = ratesForProvince(zones, form.province);
      const selectedShippingRateId = selection?.shippingRateId ?? shippingRateId;
      const validRateId = matchingRates.some(({ rate }) => rate.id === selectedShippingRateId)
        ? selectedShippingRateId
        : undefined;
      const recipientName = form.recipientName.trim();
      const recipientPhone = form.recipientPhone.trim();
      const addressLine1 = form.addressLine1.trim();
      const city = form.city.trim();
      const province = form.province.trim();
      const postalCode = form.postalCode.trim();
      if (
        !validRateId
        || !recipientName
        || recipientPhone.length < 6
        || !addressLine1
        || !city
        || !province
        || postalCode.length < 3
      ) return null;
      return {
        type: 'SHIPMENT',
        shippingRateId: validRateId,
        recipientName,
        recipientPhone,
        addressLine1,
        ...(form.addressLine2.trim() ? { addressLine2: form.addressLine2.trim() } : {}),
        city,
        province,
        postalCode,
      };
    };
    const primarySeller = sellerOptions[0];
    const primaryFulfillment = buildFulfillment(sellerOptions.length > 1 && primarySeller ? sellerSelections[primarySeller.sellerKey] : undefined, primarySeller);
    if (!primaryFulfillment) return null;
    const sellerFulfillments = sellerOptions.length > 1 ? sellerOptions.map((seller) => ({ sellerKey: seller.sellerKey, fulfillment: buildFulfillment(sellerSelections[seller.sellerKey], seller) })).filter((entry): entry is { sellerKey: string; fulfillment: NonNullable<ReturnType<typeof buildFulfillment>> } => Boolean(entry.fulfillment)) : [];
    if (sellerOptions.length > 1 && sellerFulfillments.length !== sellerOptions.length) return null;
    return {
      items: items.map((item) => ({ productId: item.id, quantity: item.quantity, productVersion: item.productVersion })),
      fulfillment: primaryFulfillment,
      ...(sellerFulfillments.length ? { sellerFulfillments } : {}),
      paymentMethod: effectivePaymentMethod,
      pointsToRedeem,
    };
  }, [items, delivery, pickupPointId, shippingRateId, form, effectivePaymentMethod, pointsToRedeem, sellerOptions, sellerSelections, shippingZones]);

  const program = loyalty.data?.program;
  const account = loyalty.data?.account;
  const estimatedMaxPoints = useMemo(() => {
    if (!program?.enabled || !account) return 0;
    if (typeof quote?.loyalty.maximumRedeemablePoints === 'number') {
      return Math.max(0, Math.min(account.available, quote.loyalty.maximumRedeemablePoints));
    }
    return estimateMaxRedeemablePoints(
      account.available,
      storeCartTotal(items),
      BigInt(program.pointValue.amountMinor),
      program.maximumRedemptionPercent,
    );
  }, [account, items, program, quote?.loyalty.maximumRedeemablePoints]);
  const pointsBelowMinimum = pointsToRedeem > 0 && pointsToRedeem < (program?.minimumRedemptionPoints ?? 0);
  const pointsAboveMaximum = pointsToRedeem > estimatedMaxPoints;
  const storeSubtotalMinor = useMemo(() => storeCartTotal(items), [items]);
  const minSubtotalToRedeemOnePoint = program
    ? BigInt(program.pointValue.amountMinor) * 100n / BigInt(Math.max(1, program.maximumRedemptionPercent))
      + ((BigInt(program.pointValue.amountMinor) * 100n) % BigInt(Math.max(1, program.maximumRedemptionPercent)) === 0n ? 0n : 1n)
    : 0n;
  const cartTooSmallForPoints = Boolean(
    program?.enabled
    && account
    && account.available >= program.minimumRedemptionPoints
    && estimatedMaxPoints < program.minimumRedemptionPoints
    && storeSubtotalMinor > 0n,
  );

  const resetQuote = () => setQuote(undefined);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    resetQuote();
  };
  const shipmentValidationMessage = useMemo(() => {
    if (delivery !== 'SHIPMENT' && sellerOptions.every((seller) => (sellerSelections[seller.sellerKey]?.delivery ?? 'PICKUP') !== 'SHIPMENT')) return null;
    if (!form.province.trim()) return 'Elegí una provincia para el envío.';
    if (!shippingRateId && sellerOptions.length <= 1) return 'Elegí una tarifa de envío.';
    if (!form.recipientName.trim()) return 'Completá el nombre completo.';
    if (form.recipientPhone.trim().length < 6) return 'El teléfono debe tener al menos 6 caracteres.';
    if (!form.addressLine1.trim()) return 'Completá la dirección.';
    if (!form.city.trim()) return 'Completá la ciudad.';
    if (form.postalCode.trim().length < 3) return 'El código postal debe tener al menos 3 caracteres.';
    return null;
  }, [delivery, form, sellerOptions, sellerSelections, shippingRateId]);
  const quoteIt = async () => {
    if (!input) {
      toast.error(shipmentValidationMessage ?? 'Completá la entrega y el pago para validar.');
      return;
    }
    setBusy(true);
    try { setQuote(await previewCheckout(input)); }
    catch (error) {
      toast.error(error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'No pudimos validar tu compra');
    }
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
                    <>
                      <label>
                        Provincia
                        <select
                          value={form.province}
                          onChange={(event) => {
                            setForm((current) => ({ ...current, province: event.target.value }));
                            setSellerSelections((current) => ({
                              ...current,
                              [seller.sellerKey]: { ...selection, shippingRateId: undefined },
                            }));
                            resetQuote();
                          }}
                        >
                          <option value="">Elegí una provincia</option>
                          {provincesFromZones(seller.shippingZones as ShippingZoneOption[]).map((province) => (
                            <option key={province} value={province}>{province}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tarifa de envío
                        <select
                          value={selection.shippingRateId ?? ''}
                          disabled={!form.province}
                          onChange={(event) => {
                            setSellerSelections((current) => ({ ...current, [seller.sellerKey]: { ...selection, shippingRateId: event.target.value } }));
                            resetQuote();
                          }}
                        >
                          <option value="">{form.province ? 'Elegí una tarifa' : 'Primero elegí la provincia'}</option>
                          {ratesForProvince(seller.shippingZones as ShippingZoneOption[], form.province).map(({ zone, rate }) => (
                            <option key={rate.id} value={rate.id}>
                              {zone.name} · {rate.name} · {formatMoney(rate.price)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </div>
              );
            })}
            <div className={`${styles.formGrid} form-grid`}>
              {[
                ['recipientName', 'Nombre completo'],
                ['recipientPhone', 'Teléfono (mín. 6)'],
                ['addressLine1', 'Dirección'],
                ['addressLine2', 'Piso/departamento (opcional)'],
                ['city', 'Ciudad'],
                ['postalCode', 'Código postal (mín. 3)'],
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
                Provincia
                <select
                  value={form.province}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, province: event.target.value }));
                    setShippingRateId('');
                    resetQuote();
                  }}
                >
                  <option value="">Elegí una provincia</option>
                  {availableProvinces.map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </label>
              <label>
                Tarifa de envío
                <select
                  value={shippingRateId}
                  disabled={!form.province}
                  onChange={(event) => {
                    setShippingRateId(event.target.value);
                    resetQuote();
                  }}
                >
                  <option value="">{form.province ? 'Elegí una tarifa' : 'Primero elegí la provincia'}</option>
                  {ratesForSelectedProvince.map(({ zone, rate }) => (
                    <option key={rate.id} value={rate.id}>
                      {zone.name} · {rate.name} · {formatMoney(rate.price)}
                    </option>
                  ))}
                </select>
              </label>
              {!form.province && availableProvinces.length === 0 && (
                <p className="form-hint">No hay zonas de envío activas configuradas.</p>
              )}
              <div className={`${styles.formGrid} form-grid`}>
                {[
                  ['recipientName', 'Nombre completo'],
                  ['recipientPhone', 'Teléfono (mín. 6)'],
                  ['addressLine1', 'Dirección'],
                  ['addressLine2', 'Piso/departamento (opcional)'],
                  ['city', 'Ciudad'],
                  ['postalCode', 'Código postal (mín. 3)'],
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
                {program.maximumRedemptionPercent}% de los productos de la tienda.{' '}
                {syncingCart
                  ? 'Actualizando precios…'
                  : cartTooSmallForPoints
                    ? `Con el subtotal actual no alcanza para canjear. Necesitás al menos ${formatMoney({ amountMinor: minSubtotalToRedeemOnePoint.toString(), currency: BASE_CURRENCY })} en productos de la tienda.`
                    : `Máximo para esta compra: ${estimatedMaxPoints} puntos.`}
              </p>
              {pointsBelowMinimum && <p className={`${styles.loyaltyInlineError} loyalty-inline-error`}>Necesitás al menos {program.minimumRedemptionPoints} puntos para canjear.</p>}
              {pointsAboveMaximum && <p className={`${styles.loyaltyInlineError} loyalty-inline-error`}>Podés usar hasta {estimatedMaxPoints} puntos en esta compra.</p>}
              {storeSubtotalMinor === 0n && Boolean(account?.available) && (
                <p className={`${styles.loyaltyInlineError} loyalty-inline-error`}>
                  Los puntos solo aplican a productos de la tienda, no a publicaciones de afiliados.
                </p>
              )}
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
          <span>Total</span>
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
              Dólar {quote.mercadoPago.casa ?? 'configurado'} venta: {quote.mercadoPago.rate} · obtenido {new Date(quote.mercadoPago.fetchedAt).toLocaleTimeString()} · vigente hasta{' '}
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
        {!input && shipmentValidationMessage && (
          <p className={`${styles.checkoutSummaryHint} form-hint checkout-summary-hint`}>{shipmentValidationMessage}</p>
        )}
        <p className={`${styles.checkoutSummaryHint} form-hint checkout-summary-hint`}>
          El precio y el saldo mostrado son informativos hasta la validación final.
        </p>
      </aside>
    </div>
  );
}
