import type { Metadata } from 'next';
import { CartView } from '@/features/cart/ui/cart-view';
export const metadata: Metadata = { title: 'Carrito' };
export default function CartPage() { return <section className="page-container"><CartView /></section>; }
