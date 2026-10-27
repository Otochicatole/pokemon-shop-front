'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, ImageOff, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '../infrastructure/store';
import { cartTotal } from '../domain/cart';
import { StorefrontMoney } from '@/shared/fx/StorefrontMoney';
import { useStorefrontFx } from '@/shared/fx/StorefrontFxProvider';
import { BASE_CURRENCY } from '@/shared/lib/currency';
import styles from './cart-view.module.css';

export function CartView() {
  const fx = useStorefrontFx();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const totalUnits = items.reduce((total, item) => total + item.quantity, 0);

  if (!items.length) {
    return (
      <div className={`${styles.cartEmptyState} empty-state cart-empty-state`}>
        <span className={styles.emptyIcon}><ShoppingBag size={32} aria-hidden="true" /></span>
        <h1>Tu carrito está vacío</h1>
        <p>Las piezas que elijas van a aparecer acá.</p>
        <Link href="/catalog" className="button button-primary">Explorar catálogo</Link>
      </div>
    );
  }

  return (
    <div className={`${styles.cartLayout} cart-layout`}>
      <section className={`${styles.cartContent} cart-content`}>
        <div className={`${styles.cartHeading} section-heading cart-heading`}>
          <div>
            <h1>Carrito</h1>
            <p>{items.length} {items.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}</p>
          </div>
          <span className={`${styles.cartCountBadge} cart-count-badge`}>
            {totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'}
          </span>
        </div>
        <div className={`${styles.cartItems} cart-items`} aria-label="Productos en el carrito">
          {items.map((item) => (
            <article className={`${styles.cartItem} cart-item`} key={item.id}>
              <div className={`${styles.cartThumb} cart-thumb`}>
                {item.images[0] ? <Image src={item.images[0].url} alt={item.name} fill sizes="(max-width: 760px) 76px, 96px" /> : <ImageOff size={24} aria-hidden="true" />}
              </div>
              <div className={`${styles.cartItemInfo} cart-item-info`}>
                <Link href={`/products/${item.slug}`} className={`${styles.cartItemLink} cart-item-link`}>
                  <h2>{item.name}</h2>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <p>
                  <StorefrontMoney money={item.price} /> por unidad
                </p>
                <p className={styles.sellerName}>Vende {item.seller?.name ?? 'Card Shop'}</p>
                <div className={`${styles.quantityControl} quantity-control`} aria-label={`Cantidad de ${item.name}`}>
                  <button type="button" aria-label="Reducir cantidad" onClick={() => setQuantity(item.id, item.quantity - 1)}>
                    <Minus size={14} />
                  </button>
                  <span className="product-data" aria-live="polite">{item.quantity}</span>
                  <button type="button" aria-label="Aumentar cantidad" disabled={item.quantity >= item.available} onClick={() => setQuantity(item.id, item.quantity + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className={`${styles.cartItemTotal} cart-item-total`}>
                <strong className="product-data"><StorefrontMoney money={{ amountMinor: (BigInt(item.price.amountMinor) * BigInt(item.quantity)).toString(), currency: BASE_CURRENCY }} /></strong>
                <button type="button" className={`${styles.cartRemoveButton} icon-button cart-remove-button`} aria-label={`Quitar ${item.name}`} title={`Quitar ${item.name}`} onClick={() => remove(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <Link href="/catalog" className={`${styles.cartContinueLink} cart-continue-link`}>
          <ArrowLeft size={16} aria-hidden="true" /> Seguir explorando el catálogo
        </Link>
      </section>
      <aside className={`${styles.cartSummary} cart-summary`}>
        <div className={`${styles.cartSummaryHeader} cart-summary-header`}>
          <div>
            <h2>Resumen</h2>
          </div>
          <span className={`${styles.cartSummaryCount} cart-summary-count`}>{totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'}</span>
        </div>
        <div className={`${styles.cartSummaryDetails} cart-summary-details`}>
          <div className="summary-line"><span>Productos</span><strong className="product-data">{items.length}</strong></div>
          <div className="summary-line"><span>Envío</span><strong className={`${styles.summaryPending} summary-pending`}>A confirmar</strong></div>
        </div>
        <div className="summary-total">
          <span>Total estimado</span>
          <strong className="product-data"><StorefrontMoney money={{ amountMinor: cartTotal(items).toString(), currency: BASE_CURRENCY }} /></strong>
        </div>
        <p className="form-hint">En el siguiente paso confirmaremos el precio, la disponibilidad y la entrega.</p>
        {!fx.rateMicros && <p className="form-hint" role="status">{fx.isLoading ? 'Calculando el equivalente en pesos. Por ahora se muestran los precios base en USD.' : 'La cotización en pesos no está disponible. Se muestran los precios base en USD.'}</p>}
        <Link href="/checkout" className="button button-primary">Continuar al checkout <ArrowRight size={17} aria-hidden="true" /></Link>
        <p className={`${styles.cartSummaryNote} cart-summary-note`}>Revisá todo antes de confirmar tu pedido.</p>
      </aside>
    </div>
  );
}
