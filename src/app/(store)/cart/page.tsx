import type { Metadata } from 'next';
import { CartView } from '@/features/cart/ui/cart-view';
import styles from './page.module.css';
export const metadata: Metadata = { title: 'Carrito' };
export default function CartPage() { return <section className="page-container"><CartView /></section>; }
