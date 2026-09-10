'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { getMe } from '@/features/auth/infrastructure/api';
import { getLoyaltyAccount } from '../infrastructure/api';

export function LoyaltyPointsIndicator() {
  const me = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false, staleTime: 60_000 });
  const loyalty = useQuery({ queryKey: ['loyalty-account', 'summary'], queryFn: () => getLoyaltyAccount(), enabled: Boolean(me.data), retry: false, staleTime: 30_000 });

  if (!me.data || !loyalty.data || loyalty.isError) return null;
  const available = loyalty.data.account.available;
  return <Link href="/account/points" className="points-link" aria-label={`Puntos disponibles: ${available}`} title="Puntos disponibles"><Coins size={17} /><span>{available}</span></Link>;
}
