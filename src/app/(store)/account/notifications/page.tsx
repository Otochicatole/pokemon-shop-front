import { NotificationsCenter } from '@/features/notifications';
import styles from './page.module.css';

export const metadata = { title: 'Notificaciones · Mi cuenta' };

export default function NotificationsPage() {
  return <section className="page-container"><NotificationsCenter role="user" /></section>;
}
