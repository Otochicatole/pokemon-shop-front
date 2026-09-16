import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import styles from './CartIndicator.module.css';

export function CartIndicator({ count, className = '' }: { count: number; className?: string }) {
  return (
    <Link href="/cart" className={`${styles.cartLink} cart-link ${className}`.trim()} aria-label={`Carrito, ${count} productos`}>
      <ShoppingBag size={18} />
      <span>{count}</span>
    </Link>
  );
}

