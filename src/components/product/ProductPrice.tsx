'use client';

import type { Money } from '@/shared/api/contracts';
import { useStorefrontFx } from '@/shared/fx/StorefrontFxProvider';
import styles from './ProductPrice.module.css';

export function ProductPrice({ price, className = '' }: { price: Money; className?: string }) {
  const fx = useStorefrontFx();
  return <strong className={`${styles.productPrice} product-price ${className}`.trim()}>{fx.formatMoney(price)}</strong>;
}
