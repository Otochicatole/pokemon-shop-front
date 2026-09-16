import type { Metadata } from 'next';
import { LoyaltyManagementView } from '@/features/loyalty-management';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Programa de puntos' };

export default function AdminLoyaltyPage() {
  return <LoyaltyManagementView />;
}
