'use client';

import type { Money } from '@/shared/api/contracts';
import { useStorefrontFx } from '@/shared/fx/StorefrontFxProvider';
import { formatMoney } from '@/shared/lib/format';
import styles from './ProductPrice.module.css';

export function ProductPrice({ price, className = '' }: { price: Money; className?: string }) {
  const fx = useStorefrontFx();
  const formatted = fx.formatMoney(price);
  return (
    <strong className={`${styles.productPrice} product-price ${className}`.trim()} title={formatted === '—' ? 'Precio base en USD. El equivalente en pesos se confirma al finalizar la compra.' : undefined}>
      {formatted === '—' ? `${formatMoney(price)} USD` : `${formatted} ARS`}
    </strong>
  );
}
