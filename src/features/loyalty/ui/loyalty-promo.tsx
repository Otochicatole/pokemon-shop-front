'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Coins, Percent, ShoppingBag } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { getLoyaltyProgram } from '../infrastructure/api';

export function LoyaltyPromo() {
  const query = useQuery({ queryKey: ['loyalty-program'], queryFn: getLoyaltyProgram, staleTime: 60_000 });
  const program = query.data;
  if (!program?.enabled) return null;
  return <section className="trainer-club"><div className="club-card"><span className="club-level">CLUB DE ENTRENADORES · PUNTOS</span><h2>Sumá puntos.<br />Desbloqueá descuentos.</h2><p>Cada compra acreditada aumenta tu saldo. Elegí cuántos puntos usar en el checkout y el descuento se aplica al instante.</p><Link className="button button-primary" href="/account/points">Ver mis puntos <ArrowUpRight size={15} /></Link></div><div className="xp-box loyalty-promo-rules"><div className="xp-top"><span>REGLA VIGENTE</span><b>Beneficio automático</b></div><div className="loyalty-promo-rule"><span><ShoppingBag size={21} /></span><div><small>SUMÁS</small><strong>{program.pointsPerStep} {program.pointsPerStep === 1 ? 'punto' : 'puntos'} cada {formatMoney(program.spendPerPoint)}</strong></div></div><div className="loyalty-promo-rule"><span><Coins size={21} /></span><div><small>CANJEÁS</small><strong>{formatMoney(program.pointValue)} por punto</strong></div></div><div className="loyalty-promo-rule"><span><Percent size={21} /></span><div><small>LÍMITE</small><strong>Hasta {program.maximumRedemptionPercent}% de productos</strong></div></div></div></section>;
}
