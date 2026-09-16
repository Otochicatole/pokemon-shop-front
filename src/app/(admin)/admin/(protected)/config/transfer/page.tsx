import type { Metadata } from 'next';
import { TransferSettingsManagementView } from '@/features/transfer-settings';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Datos de transferencia' };

export default function AdminTransferSettingsPage() {
  return <TransferSettingsManagementView />;
}
