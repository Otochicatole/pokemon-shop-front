'use client';
import { useCartStore } from '@/features/cart/infrastructure/store';
import { SessionMenu } from '@/features/auth/ui/session-menu';
import { Header } from '@/components/navigation';

export function StoreHeader() {
  const count = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  return <Header cartCount={count} sessionSlot={<SessionMenu />} />;
}
