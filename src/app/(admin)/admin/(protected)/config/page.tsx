import type { Metadata } from 'next';
import { ConfigurationHomeView } from '@/features/transfer-settings';

export const metadata: Metadata = { title: 'Configuración' };

export default function AdminConfigurationPage() {
  return <ConfigurationHomeView />;
}
