import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
export function CartIndicator({ count, className = '' }: { count: number; className?: string }) { return <Link href="/cart" className={`cart-link ${className}`} aria-label={`Carrito, ${count} productos`}><ShoppingBag size={18} /><span>{count}</span></Link>; }
