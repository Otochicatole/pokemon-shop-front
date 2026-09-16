import { NotificationsCenter } from '@/features/notifications';
import styles from './page.module.css';

export const metadata = { title: 'Notificaciones · CMS' };

export default function NotificationsPage() {
  return <NotificationsCenter role="admin" />;
}
