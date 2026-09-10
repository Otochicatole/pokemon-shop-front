'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Coins, Gift, History, LockKeyhole } from 'lucide-react';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { getLoyaltyAccount } from '../infrastructure/api';

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
  if (query.isLoading) return <div className="page-loading">Cargando tus puntos…</div>;
  if (query.isError || !query.data?.pages[0]) return <div className="empty-state"><h1>Tus puntos</h1><p>Iniciá sesión para consultar tu saldo y tus movimientos.</p><Link href="/auth/login?returnTo=/account/points" className="button button-primary">Ingresar</Link></div>;
  const first = query.data.pages[0];
  const transactions = query.data.pages.flatMap((page) => page.transactions);
  const { account, program } = first;
  return <div className="loyalty-page">
    <header className="section-heading"><p className="eyebrow">Club de entrenadores</p><h1>Mis puntos</h1><p>Tu saldo disponible se valida nuevamente cuando confirmás una compra.</p></header>
    <div className="loyalty-stats">
      <article className="loyalty-balance-card"><span><Coins size={20} /> Disponibles</span><strong>{account.available}</strong><small>puntos para usar</small></article>
      <article><span><LockKeyhole size={18} /> Reservados</span><strong>{account.reserved}</strong><small>en órdenes pendientes</small></article>
      <article><span><Gift size={18} /> Ganados</span><strong>{account.lifetimeEarned}</strong><small>puntos acreditados</small></article>
    </div>
    <section className="loyalty-rule-card">
      <div><p className="eyebrow">Regla vigente</p><h2>{program.enabled ? 'Tus compras tienen recompensa' : 'Programa temporalmente pausado'}</h2></div>
      {program.enabled && <p>Cada <strong>{formatMoney(program.spendPerPoint)}</strong> netos en productos sumás <strong>{program.pointsPerStep} {program.pointsPerStep === 1 ? 'punto' : 'puntos'}</strong>. Cada punto descuenta <strong>{formatMoney(program.pointValue)}</strong>, con un máximo del {program.maximumRedemptionPercent}% por orden y un canje mínimo de {program.minimumRedemptionPoints} puntos.</p>}
      <Link className="button button-secondary" href="/catalog">Explorar catálogo</Link>
    </section>
    <section className="loyalty-history"><div className="loyalty-history-heading"><div><History size={19} /><h2>Movimientos</h2></div><span>{transactions.length}</span></div>
      {transactions.length ? <div className="loyalty-transactions">{transactions.map((entry) => <article key={entry.id}><div><strong>{transactionLabels[entry.type]}</strong><span>{entry.description ?? formatDate(entry.createdAt)}</span>{entry.orderNumber && <Link href={`/account/orders/${entry.orderNumber}`}>Orden {entry.orderNumber}</Link>}</div><div className={entry.points >= 0 ? 'is-positive' : 'is-negative'}><strong>{entry.points > 0 ? '+' : ''}{entry.points}</strong><span>Saldo {entry.balanceAfter}</span></div></article>)}</div> : <div className="loyalty-empty"><Coins size={24} /><p>Todavía no hay movimientos. Tus puntos aparecerán cuando se acredite tu primera compra.</p></div>}
      {query.hasNextPage && <button className="button button-secondary" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Cargando…' : 'Ver más movimientos'}</button>}
    </section>
  </div>;
}
