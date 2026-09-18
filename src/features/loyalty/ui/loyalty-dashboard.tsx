'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Coins, Gift, History, LockKeyhole } from 'lucide-react';
import { EmptyState } from '@/components/feedback';
import { formatDate } from '@/shared/lib/format';
import { StorefrontMoney } from '@/shared/fx/StorefrontMoney';
import { getLoyaltyAccount } from '../infrastructure/api';
import styles from './loyalty-dashboard.module.css';

const transactionLabels = {
  EARN: 'Compra acreditada',
  REDEEM: 'Descuento canjeado',
  EARN_REVERSAL: 'Puntos revertidos',
  REDEEM_REVERSAL: 'Canje devuelto',
  ADJUSTMENT: 'Ajuste de saldo',
} as const;

export function LoyaltyDashboard() {
  const query = useInfiniteQuery({
    queryKey: ['loyalty-account', 'history'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getLoyaltyAccount(pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
  });

  if (query.isLoading) return <div className={styles.pageLoading}>Cargando tus puntos…</div>;
  if (query.isError || !query.data?.pages[0]) {
    return (
      <EmptyState
        title="Tus puntos"
        description="Iniciá sesión para consultar tu saldo y tus movimientos."
        icon={<Coins size={34} aria-hidden="true" />}
        className={styles.emptyFrame}
      >
        <Link href="/auth/login?returnTo=/account/points" className="button button-primary">
          Ingresar
        </Link>
      </EmptyState>
    );
  }

  const first = query.data.pages[0];
  const transactions = query.data.pages.flatMap((page) => page.transactions);
  const { account, program } = first;

  return (
    <div className={styles.loyaltyPage}>
      <Link href="/account" className={`back-link ${styles.backLink}`}>
        <ArrowLeft size={15} aria-hidden="true" />
        Volver a mi cuenta
      </Link>
      <header className={styles.heading}>
        <div>
          <p className="eyebrow">Club de entrenadores</p>
          <h1>Mis puntos</h1>
          <p>Tu saldo disponible se valida nuevamente cuando confirmás una compra.</p>
        </div>
      </header>

      <div className={styles.loyaltyStats}>
        <article className={styles.loyaltyBalanceCard}>
          <span>
            <Coins size={20} /> Disponibles
          </span>
          <strong>{account.available}</strong>
          <small>puntos para usar</small>
        </article>
        <article>
          <span>
            <LockKeyhole size={18} /> Reservados
          </span>
          <strong>{account.reserved}</strong>
          <small>en órdenes pendientes</small>
        </article>
        <article>
          <span>
            <Gift size={18} /> Ganados
          </span>
          <strong>{account.lifetimeEarned}</strong>
          <small>puntos acreditados</small>
        </article>
      </div>

      <section className={styles.loyaltyRuleCard}>
        <div>
          <p className="eyebrow">Regla vigente</p>
          <h2>{program.enabled ? 'Tus compras tienen recompensa' : 'Programa temporalmente pausado'}</h2>
        </div>
        {program.enabled && (
          <p>
            Cada <strong><StorefrontMoney money={program.spendPerPoint} /></strong> netos en productos sumás{' '}
            <strong>
              {program.pointsPerStep} {program.pointsPerStep === 1 ? 'punto' : 'puntos'}
            </strong>
            . Cada punto descuenta <strong><StorefrontMoney money={program.pointValue} /></strong>, con un máximo del{' '}
            {program.maximumRedemptionPercent}% por orden y un canje mínimo de {program.minimumRedemptionPoints}{' '}
            puntos.
          </p>
        )}
        <Link className="button button-secondary" href="/catalog">
          Explorar catálogo
        </Link>
      </section>

      <section className={styles.loyaltyHistory}>
        <div className={styles.loyaltyHistoryHeading}>
          <div>
            <History size={19} />
            <h2>Movimientos</h2>
          </div>
          <span>{transactions.length}</span>
        </div>
        {transactions.length ? (
          <div className={styles.loyaltyTransactions}>
            {transactions.map((entry) => (
              <article key={entry.id}>
                <div>
                  <strong>{transactionLabels[entry.type]}</strong>
                  <span>{entry.description ?? formatDate(entry.createdAt)}</span>
                  {entry.orderNumber && (
                    <Link href={`/account/orders/${entry.orderNumber}`}>Orden {entry.orderNumber}</Link>
                  )}
                </div>
                <div className={entry.points >= 0 ? styles.isPositive : styles.isNegative}>
                  <strong>
                    {entry.points > 0 ? '+' : ''}
                    {entry.points}
                  </strong>
                  <span>Saldo {entry.balanceAfter}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.loyaltyEmpty}>
            <Coins size={24} />
            <p>Todavía no hay movimientos. Tus puntos aparecerán cuando se acredite tu primera compra.</p>
          </div>
        )}
        {query.hasNextPage && (
          <button
            type="button"
            className={`button button-secondary ${styles.loadMore}`}
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Cargando…' : 'Ver más movimientos'}
          </button>
        )}
      </section>
    </div>
  );
}
