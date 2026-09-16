'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Coins, Percent, ShoppingBag } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { getLoyaltyProgram } from '../infrastructure/api';

import styles from './loyalty-promo.module.css';

export function LoyaltyPromo() {
  const query = useQuery({ queryKey: ['loyalty-program'], queryFn: getLoyaltyProgram, staleTime: 60_000 });
  const program = query.data;
  if (!program?.enabled) return null;
  return (
    <section className={`${styles.trainerClub} trainer-club`}>
      <div className={`${styles.clubCard} club-card`}>
        <span className={`${styles.clubLevel} club-level`}>CLUB DE ENTRENADORES · PUNTOS</span>
        <h2>Sumá puntos.<br />Desbloqueá descuentos.</h2>
        <p>Cada compra acreditada aumenta tu saldo. Elegí cuántos puntos usar en el checkout y el descuento se aplica al instante.</p>
        <Link className="button button-primary" href="/account/points">Ver mis puntos <ArrowUpRight size={15} /></Link>
      </div>
      <div className={`${styles.xpBox} ${styles.loyaltyPromoRules} xp-box loyalty-promo-rules`}>
        <div className={`${styles.xpTop} xp-top`}>
          <span>REGLA VIGENTE</span>
          <b>Beneficio automático</b>
        </div>
        <div className={`${styles.loyaltyPromoRule} loyalty-promo-rule`}>
          <span><ShoppingBag size={21} /></span>
          <div>
            <small>SUMÁS</small>
            <strong>{program.pointsPerStep} {program.pointsPerStep === 1 ? 'punto' : 'puntos'} cada {formatMoney(program.spendPerPoint)}</strong>
          </div>
        </div>
        <div className={`${styles.loyaltyPromoRule} loyalty-promo-rule`}>
          <span><Coins size={21} /></span>
          <div>
            <small>CANJEÁS</small>
            <strong>{formatMoney(program.pointValue)} por punto</strong>
          </div>
        </div>
        <div className={`${styles.loyaltyPromoRule} loyalty-promo-rule`}>
          <span><Percent size={21} /></span>
          <div>
            <small>LÍMITE</small>
            <strong>Hasta {program.maximumRedemptionPercent}% de productos</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

