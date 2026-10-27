import type { Metadata } from 'next';
import { LoyaltyDashboard } from '@/features/loyalty';

export const metadata: Metadata = { title: 'Mis puntos' };

export default function LoyaltyPage() {
  return <section className="page-container"><LoyaltyDashboard /></section>;
}
