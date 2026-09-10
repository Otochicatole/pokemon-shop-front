import type { Metadata } from 'next';
import { LoyaltyManagementView } from '@/features/loyalty-management';

export const metadata: Metadata = { title: 'Programa de puntos' };

export default function AdminLoyaltyPage() {
  return <LoyaltyManagementView />;
}
