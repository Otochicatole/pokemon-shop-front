import type { Metadata } from 'next';
import { ConfigurationHomeView } from '@/features/transfer-settings';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Configuración' };

export default function AdminConfigurationPage() {
  return <ConfigurationHomeView />;
}
