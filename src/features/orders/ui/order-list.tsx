'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowRight, Package } from 'lucide-react';
import { StatusBadge } from '@/components/badge';
import type { BadgeTone } from '@/components/badge';
import { EmptyState } from '@/components/feedback';
import { listOrders } from '../infrastructure/api';
import { formatDate, statusLabel } from '@/shared/lib/format';
import { StorefrontMoney } from '@/shared/fx/StorefrontMoney';
import styles from './order-list.module.css';

function statusTone(status: string): BadgeTone {
  if (['COMPLETED', 'PAID', 'PICKED_UP'].includes(status)) return 'green';
  if (['CANCELLED', 'EXPIRED', 'REFUND_RECORDED', 'REFUNDED', 'DISPUTED'].includes(status)) return 'red';
  if (['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'ACTION_REQUIRED'].includes(status)) return 'yellow';
  if (['PREPARING', 'READY_FOR_PICKUP', 'SHIPPED', 'IN_FULFILLMENT'].includes(status)) return 'cyan';
  return 'purple';
}

export function OrderList() {
  const query = useInfiniteQuery({
    queryKey: ['orders'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listOrders(pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const orders = query.data?.pages.flatMap((p) => p.data) ?? [];

  if (query.isLoading) return (
    <div className={styles.loadingList} role="status" aria-label="Cargando historial de órdenes">
      {[0, 1, 2].map((item) => <div key={item} className={styles.loadingRow} />)}
    </div>
  );
  if (query.isError && !orders.length) return (
    <EmptyState title="No pudimos cargar tus órdenes" description="Intentá nuevamente para ver el historial de tus compras." className={styles.empty}>
      <button type="button" className="button button-secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>Reintentar</button>
    </EmptyState>
  );
  if (!orders.length) {
    return (
      <EmptyState
        title="Todavía no tenés órdenes"
        description="Cuando hagas tu primera compra, la vas a encontrar acá."
        icon={<Package size={34} aria-hidden="true" />}
        className={styles.empty}
      >
        <Link href="/catalog" className="button button-primary">
          Explorar catálogo
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className={styles.ordersList}>
      <div className={styles.listMeta}>
        <span>
          {orders.length} {orders.length === 1 ? 'orden' : 'órdenes'}
        </span>
      </div>
      {orders.map((order) => (
        <Link
          href={`/account/orders/${order.number}`}
          className={styles.orderRow}
          key={order.id}
        >
          <span className={styles.orderIcon}><Package size={21} aria-hidden="true" /></span>
          <div className={styles.orderCopy}>
            <strong>{order.number}</strong>
            <span>
              {formatDate(order.createdAt)} · {order.items.length}{' '}
              {order.items.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>
          <div className={styles.orderMeta}>
            <StatusBadge status={statusLabel(order.status)} tone={statusTone(order.status)} />
            <strong><StorefrontMoney money={order.totals.total} /></strong>
          </div>
          <ArrowRight className={styles.orderArrow} size={18} aria-hidden="true" />
        </Link>
      ))}
      {query.isFetchNextPageError && <p className={styles.loadError} role="alert">No pudimos cargar más órdenes. Podés volver a intentarlo.</p>}
      {query.hasNextPage && (
        <button
          type="button"
          className={`button button-secondary ${styles.loadMore}`}
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </div>
  );
}
