'use client';

import Link from 'next/link';
import { Bell, Check, CheckCheck, CircleAlert, Clock3, Headphones, PackageCheck, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/feedback';
import { ApiError } from '@/shared/api/client';
import { AdminApiError } from '@/shared/admin/client';
import { getMe } from '@/features/auth/infrastructure/api';
import type { Notification } from '../domain/contracts';
import {
  listAdminNotifications,
  listNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  markAllNotificationsRead,
  markNotificationRead,
} from '../infrastructure/api';
import styles from './notifications.module.css';

type Role = 'user' | 'admin';
type Filter = 'ALL' | 'UNREAD';

function errorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof AdminApiError) return error.message;
  return error instanceof Error ? error.message : 'Intentá nuevamente en unos segundos.';
}

function notificationHref(notification: Notification, role: Role) {
  return notification.reference.kind === 'ORDER'
    ? `${role === 'admin' ? '/admin/orders' : '/account/orders'}/${encodeURIComponent(notification.reference.orderNumber)}`
    : `${role === 'admin' ? '/admin/support' : '/account/support'}/${encodeURIComponent(notification.reference.conversationId)}`;
}

function notificationIcon(type: Notification['type']) {
  if (type === 'SUPPORT_MESSAGE') return <Headphones size={19} aria-hidden="true" />;
  if (type === 'PAYMENT_REQUIRES_REVIEW' || type === 'TRANSFER_RECEIPT_SUBMITTED') return <CircleAlert size={19} aria-hidden="true" />;
  return <PackageCheck size={19} aria-hidden="true" />;
}

function notificationCategory(type: Notification['type']) {
  return type === 'SUPPORT_MESSAGE' ? 'Soporte' : 'Orden';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function NotificationsCenter({ role }: { role: Role }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('ALL');
  const session = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: role === 'user', retry: false });
  const key = role === 'admin' ? ['admin', 'notifications', filter] : ['notifications', filter];
  const query = useInfiniteQuery({
    queryKey: key,
    enabled: role === 'admin' || Boolean(session.data),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => role === 'admin'
      ? listAdminNotifications({ cursor: pageParam, unreadOnly: filter === 'UNREAD' })
      : listNotifications({ cursor: pageParam, unreadOnly: filter === 'UNREAD' }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: false,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => role === 'admin' ? markAdminNotificationRead(id) : markNotificationRead(id),
    onSuccess: (result, id) => {
      queryClient.setQueryData<number>(['notifications', role, 'unread-count'], result.unreadCount);
      queryClient.setQueryData<number>(['notifications', 'unread-count'], result.unreadCount);
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      void id;
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const markAll = useMutation({
    mutationFn: () => role === 'admin' ? markAllAdminNotificationsRead() : markAllNotificationsRead(),
    onSuccess: async () => {
      queryClient.setQueryData(['notifications', role, 'unread-count'], 0);
      await queryClient.invalidateQueries({ queryKey: key });
      toast.success('Notificaciones marcadas como leídas');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  const basePath = role === 'admin' ? '/admin' : '/account';

  if (role === 'user' && session.isLoading) return <div className={styles.loading}>Cargando cuenta…</div>;
  if (role === 'user' && !session.data) return <div className={styles.empty}><Bell size={34} aria-hidden="true" /><h2>Ingresá para ver tus notificaciones</h2><p>Las novedades de tus órdenes y soporte aparecen en tu cuenta.</p><Link href="/auth/login?returnTo=/account/notifications" className="button button-primary">Ingresar</Link></div>;

  const openNotification = (notification: Notification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    router.push(notificationHref(notification, role));
  };

  return <div className={styles.center}>
    <Link href={basePath} className="back-link">← Volver a {role === 'admin' ? 'dashboard' : 'mi cuenta'}</Link>
    <header className={styles.heading}>
      <div><p className="eyebrow">Centro de avisos</p><h1><Bell size={27} aria-hidden="true" />Notificaciones</h1><p>Todo lo importante sobre tus órdenes y conversaciones aparece acá.</p></div>
      <div className={styles.actions}><Button variant="ghost" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} aria-hidden="true" />Actualizar</Button><Button variant="secondary" onClick={() => markAll.mutate()} disabled={markAll.isPending || !items.some((item) => !item.readAt)}><CheckCheck size={16} aria-hidden="true" />Marcar todas como leídas</Button></div>
    </header>
    <div className={styles.toolbar} role="tablist" aria-label="Filtro de notificaciones">
      <button type="button" role="tab" aria-selected={filter === 'ALL'} className={filter === 'ALL' ? styles.activeTab : ''} onClick={() => setFilter('ALL')}>Todas</button>
      <button type="button" role="tab" aria-selected={filter === 'UNREAD'} className={filter === 'UNREAD' ? styles.activeTab : ''} onClick={() => setFilter('UNREAD')}>Sin leer</button>
    </div>
    {query.isLoading ? <div className={styles.loading}>Cargando notificaciones…</div> : query.isError ? <ErrorState title="No pudimos cargar las notificaciones" description={errorMessage(query.error)}><Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button></ErrorState> : items.length === 0 ? <div className={styles.empty}><Bell size={34} aria-hidden="true" /><h2>{filter === 'UNREAD' ? 'No tenés avisos sin leer' : 'Todavía no hay notificaciones'}</h2><p>Cuando haya una novedad sobre una orden o soporte, la vas a encontrar acá.</p></div> : <div className={styles.list}>
      {items.map((notification) => <article key={notification.id} className={`${styles.item} ${notification.readAt ? '' : styles.unread}`}>
        <button type="button" className={styles.itemButton} onClick={() => openNotification(notification)}>
          <span className={styles.icon}>{notificationIcon(notification.type)}</span>
          <span className={styles.copy}><span className={styles.itemMeta}><strong>{notificationCategory(notification.type)}</strong><time dateTime={notification.createdAt}><Clock3 size={13} aria-hidden="true" />{formatDate(notification.createdAt)}</time></span><strong className={styles.title}>{notification.title}</strong><span>{notification.message}</span></span>
          {!notification.readAt && <span className={styles.dot} aria-label="Sin leer" />}
        </button>
        {!notification.readAt && <button type="button" className={styles.readButton} onClick={() => markRead.mutate(notification.id)} disabled={markRead.isPending}><Check size={15} aria-hidden="true" />Marcar leída</button>}
      </article>)}
      {query.hasNextPage && <Button variant="secondary" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>{query.isFetchingNextPage ? 'Cargando…' : 'Ver notificaciones anteriores'}</Button>}
    </div>}
  </div>;
}
