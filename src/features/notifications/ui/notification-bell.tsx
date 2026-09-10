'use client';

import Link from 'next/link';
import { Bell, BellRing } from 'lucide-react';
import { useSupportRealtime } from '@/features/support-realtime';

export function NotificationBell({ variant = 'store' }: { variant?: 'store' | 'admin' }) {
  const { authenticated, notificationUnreadCount, connectionState, role } = useSupportRealtime();
  if (!authenticated) return null;
  const href = role === 'admin' ? '/admin/notifications' : '/account/notifications';
  const countLabel = notificationUnreadCount > 99 ? '99+' : String(notificationUnreadCount);
  const label = notificationUnreadCount > 0
    ? `Notificaciones: ${notificationUnreadCount} sin leer`
    : 'Notificaciones: sin novedades';
  const Icon = notificationUnreadCount > 0 ? BellRing : Bell;
  return <Link
    href={href}
    className={`support-notification-link support-notification-link-${variant} ${notificationUnreadCount > 0 ? 'has-unread' : ''}`}
    aria-label={label}
    title={connectionState === 'reconnecting' ? `${label}. Reconectando…` : label}
  >
    <Icon size={variant === 'admin' ? 18 : 17} aria-hidden="true" />
    {notificationUnreadCount > 0 && <span aria-hidden="true">{countLabel}</span>}
  </Link>;
}
