import type { Metadata } from 'next';
import { CheckoutFlow } from '@/features/checkout/ui/checkout-flow';
import styles from './page.module.css';
export const metadata: Metadata = { title: 'Checkout' };
export default function CheckoutPage() { return <section className="page-container"><CheckoutFlow /></section>; }
