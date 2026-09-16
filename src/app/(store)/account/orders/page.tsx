import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { OrderList } from '@/features/orders/ui/order-list';
import styles from './page.module.css';

export default function OrdersPage() {
  return (
    <section className={`page-container ${styles.page}`}>
      <Link href="/account" className={`back-link ${styles.backLink}`}>
        <ArrowLeft size={15} aria-hidden="true" />
        Volver a mi cuenta
      </Link>
      <header className={styles.heading}>
        <div>
          <p className="eyebrow">Tu actividad</p>
          <h1>Mis órdenes</h1>
          <p>Seguimiento de compras y pagos.</p>
        </div>
      </header>
      <OrderList />
    </section>
  );
}
