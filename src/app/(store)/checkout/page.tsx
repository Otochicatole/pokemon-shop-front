import type { Metadata } from 'next';
import { CheckoutFlow } from '@/features/checkout/ui/checkout-flow';
export const metadata: Metadata = { title: 'Checkout' };
export default function CheckoutPage() { return <section className="page-container"><CheckoutFlow /></section>; }
