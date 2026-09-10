'use client';

import Link from 'next/link';
import { Bell, BellRing } from 'lucide-react';
import { useSupportRealtime } from './support-realtime-provider';

export function SupportNotificationBell({ variant = 'store' }: { variant?: 'store' | 'admin' }) {
  const { authenticated, unreadCount, connectionState, role } = useSupportRealtime();
  if (!authenticated) return null;
  const href = role === 'admin' ? '/admin/support' : '/account/support';
  const countLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const label = unreadCount > 0
    ? `Soporte: ${unreadCount} ${unreadCount === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}`
    : 'Soporte: sin mensajes nuevos';
  const Icon = unreadCount > 0 ? BellRing : Bell;
  return <Link
    href={href}
    className={`support-notification-link support-notification-link-${variant} ${unreadCount > 0 ? 'has-unread' : ''}`}
    aria-label={label}
    title={connectionState === 'reconnecting' ? `${label}. Reconectando…` : label}
  >
    <Icon size={variant === 'admin' ? 18 : 17} aria-hidden="true" />
    {unreadCount > 0 && <span aria-hidden="true">{countLabel}</span>}
  </Link>;
}
