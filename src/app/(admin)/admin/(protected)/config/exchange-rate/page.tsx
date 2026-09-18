import type { Metadata } from 'next';
import { ExchangeRateSettingsManagementView } from '@/features/exchange-rate-settings';

export const metadata: Metadata = { title: 'Tipo de dólar' };

export default function AdminExchangeRateSettingsPage() {
  return <ExchangeRateSettingsManagementView />;
}
