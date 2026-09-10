import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { OrderList } from '@/features/orders/ui/order-list';

export default function OrdersPage() {
  return <section className="page-container">
    <Link href="/account" className="back-link"><ArrowLeft size={15} aria-hidden="true" />Volver a mi cuenta</Link>
    <div className="section-heading"><p className="eyebrow">Tu actividad</p><h1>Mis órdenes</h1><p>Seguimiento de compras y pagos.</p></div>
    <OrderList />
  </section>;
}
