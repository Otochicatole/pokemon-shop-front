import { NotificationsCenter } from '@/features/notifications';

export const metadata = { title: 'Notificaciones · Mi cuenta' };

export default function NotificationsPage() {
  return <section className="page-container"><NotificationsCenter role="user" /></section>;
}
