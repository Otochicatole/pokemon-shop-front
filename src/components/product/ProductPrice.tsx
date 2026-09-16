import { formatMoney } from '@/shared/lib/format';
import type { Money } from '@/shared/api/contracts';
import styles from './ProductPrice.module.css';

export function ProductPrice({ price, className = '' }: { price: Money; className?: string }) {
  return <strong className={`${styles.productPrice} product-price ${className}`.trim()}>{formatMoney(price)}</strong>;
}

