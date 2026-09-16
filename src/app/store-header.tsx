'use client';
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useCartStore } from '@/features/cart/infrastructure/store';
import { SessionMenu } from '@/features/auth/ui/session-menu';
import { getMe } from '@/features/auth/infrastructure/api';
import { Header } from '@/components/navigation';

import styles from './store-header.module.css';

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function StoreHeader() {
  const count = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const mounted = useSyncExternalStore(subscribeToHydration, getClientHydrationSnapshot, getServerHydrationSnapshot);
  const session = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  return <div className={styles.storeHeader}><Header cartCount={count} showAffiliateNav={mounted && Boolean(session.data?.affiliate)} sessionSlot={<SessionMenu />} /></div>;
}

