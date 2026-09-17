'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bell,
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  Headphones,
  PackageCheck,
  RefreshCw,
  Store,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/feedback';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/feedback';
import { ApiError } from '@/shared/api/client';
import { AdminApiError } from '@/shared/admin/client';
import { getMe } from '@/features/auth/infrastructure/api';
import type { Notification, NotificationType } from '../domain/contracts';
import {
  listAdminNotifications,
  listNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  markAllNotificationsRead,
  markNotificationRead,
} from '../infrastructure/api';
import styles from './notifications-center.module.css';
import shared from '@/components/admin/admin-shared.module.css';
import headerStyles from '@/components/admin/AdminPageHeader.module.css';
type Role = 'user' | 'admin';
type Filter = 'ALL' | 'UNREAD';
type Category = 'support' | 'order' | 'payment' | 'affiliate';

const filterLabels: Record<Filter, string> = {
  ALL: 'Todas',
  UNREAD: 'Sin leer',
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof AdminApiError) return error.message;
  return error instanceof Error ? error.message : 'Intentá nuevamente en unos segundos.';
}

function notificationHref(notification: Notification, role: Role) {
  if (!notification.reference) {
    return role === 'admin' ? '/admin' : '/account';
  }
  switch (notification.reference.kind) {
    case 'ORDER':
      return `${role === 'admin' ? '/admin/orders' : '/account/orders'}/${encodeURIComponent(notification.reference.orderNumber)}`;
    case 'SELLER_ORDER':
      return role === 'admin'
        ? `/admin/affiliates/orders/${encodeURIComponent(notification.reference.sellerOrderId)}`
        : '/affiliate/orders';
    case 'AFFILIATE_LISTING':
      return role === 'admin'
        ? `/admin/affiliates/listings/${encodeURIComponent(notification.reference.listingId)}`
        : '/affiliate/listings';
    case 'AFFILIATE_PAYOUT':
      return role === 'admin'
        ? `/admin/affiliates/payouts/${encodeURIComponent(notification.reference.payoutId)}`
        : '/affiliate/balance';
    case 'SUPPORT_CONVERSATION':
      return `${role === 'admin' ? '/admin/support' : '/account/support'}/${encodeURIComponent(notification.reference.conversationId)}`;
  }
}

function notificationCategory(type: NotificationType): Category {
  if (type === 'SUPPORT_MESSAGE') return 'support';
  if (type === 'PAYMENT_REQUIRES_REVIEW' || type === 'TRANSFER_RECEIPT_SUBMITTED' || type === 'PAYMENT_APPROVED') return 'payment';
  if (type.startsWith('AFFILIATE_')) return 'affiliate';
  return 'order';
}

const categoryLabels: Record<Category, string> = {
  support: 'Soporte',
  order: 'Orden',
  payment: 'Pago',
  affiliate: 'Afiliado',
};

const categoryIconClass: Record<Category, string> = {
  support: styles.iconSupport,
  order: styles.iconOrder,
  payment: styles.iconPayment,
  affiliate: styles.iconAffiliate,
};

const categoryBadgeClass: Record<Category, string> = {
  support: styles.badgeSupport,
  order: styles.badgeOrder,
  payment: styles.badgePayment,
  affiliate: styles.badgeAffiliate,
};

function notificationIcon(type: NotificationType) {
  const category = notificationCategory(type);
  if (category === 'support') return <Headphones size={18} aria-hidden="true" />;
  if (type === 'PAYMENT_REQUIRES_REVIEW' || type === 'TRANSFER_RECEIPT_SUBMITTED') {
    return <CircleAlert size={18} aria-hidden="true" />;
  }
  if (category === 'payment') return <Banknote size={18} aria-hidden="true" />;
  if (category === 'affiliate') {
    if (type.includes('PAYOUT')) return <Banknote size={18} aria-hidden="true" />;
    return <Store size={18} aria-hidden="true" />;
  }
  return <PackageCheck size={18} aria-hidden="true" />;
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
    onSuccess: (result) => {
      queryClient.setQueryData<number>(['notifications', role, 'unread-count'], result.unreadCount);
      queryClient.setQueryData<number>(['notifications', 'unread-count'], result.unreadCount);
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
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
  const isAdmin = role === 'admin';
  const basePath = isAdmin ? '/admin' : '/account';
  const hasUnread = items.some((item) => !item.readAt);

  if (role === 'user' && session.isLoading) return <div className="page-loading">Cargando cuenta…</div>;
  if (role === 'user' && !session.data) {
    return <div className="empty-state">
      <Bell className="empty-icon" aria-hidden="true" />
      <h1>Notificaciones</h1>
      <p>Ingresá a tu cuenta para ver novedades de órdenes, pagos y soporte.</p>
      <Link href="/auth/login?returnTo=/account/notifications" className="button button-primary">Ingresar</Link>
    </div>;
  }

  const openNotification = (notification: Notification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    router.push(notificationHref(notification, role));
  };

  return <div className={`${styles.center} ${isAdmin ? styles.admin : ''}`}>
    {!isAdmin && (
      <Link href={basePath} className={`${styles.backLink} back-link`}>
        <ArrowLeft size={15} aria-hidden="true" />
        Volver a mi cuenta
      </Link>
    )}

    <header className={isAdmin ? headerStyles.adminPageHeader : styles.heading}>
      <div>
        <p className={isAdmin ? headerStyles.adminEyebrow : styles.eyebrow}>{isAdmin ? 'Operaciones' : 'Centro de avisos'}</p>
        <h1>Notificaciones</h1>
        <p>
          {isAdmin
            ? 'Avisos de pedidos, pagos, afiliados y soporte que requieren acción del equipo.'
            : 'Todo lo importante sobre tus órdenes, pagos, afiliado y soporte aparece acá.'}
        </p>
      </div>
      <div className={isAdmin ? headerStyles.adminPageActions : styles.actions}>
        <Button variant="secondary" onClick={() => markAll.mutate()} disabled={markAll.isPending || !hasUnread}>
          <CheckCheck size={16} aria-hidden="true" />
          Marcar todas como leídas
        </Button>
      </div>
    </header>

    <section className={`${styles.panel} ${isAdmin? shared.adminPanel : ''}`} aria-labelledby="notifications-list">
      <div className={isAdmin ? shared.adminPanelHeader : styles.panelHeading}>
        <div className={styles.panelTitle}>
          {!isAdmin && <span className={styles.iconBox}><Bell size={18} aria-hidden="true" /></span>}
          <div>
            {isAdmin ? (
              <>
                <span className={shared.adminPanelKicker}>Bandeja operativa</span>
                <h2 id="notifications-list">Inbox del equipo</h2>
              </>
            ) : (
              <>
                <p className={styles.panelKicker}>Bandeja</p>
                <h2 id="notifications-list">Mis avisos</h2>
              </>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          className={styles.refreshButton}
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          aria-label="Actualizar notificaciones"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Actualizar
        </Button>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.toolbar} role="tablist" aria-label="Filtro de notificaciones">
          {(Object.keys(filterLabels) as Filter[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={filter === value ? styles.activeTab : undefined}
              onClick={() => setFilter(value)}
            >
              {filterLabels[value]}
            </button>
          ))}
        </div>

        {query.isLoading ? (
          <div className={styles.listLoading} aria-live="polite">Cargando notificaciones…</div>
        ) : query.isError ? (
          <ErrorState title="No pudimos cargar las notificaciones" description={errorMessage(query.error)}>
            <Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button>
          </ErrorState>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={30} aria-hidden="true" />
            <h3>
              {filter === 'UNREAD'
                ? (isAdmin ? 'No hay avisos pendientes' : 'No tenés avisos sin leer')
                : (isAdmin ? 'La bandeja está vacía' : 'Todavía no hay notificaciones')}
            </h3>
            <p>
              {isAdmin
                ? 'Cuando un pedido, pago, afiliado o ticket necesite revisión, va a aparecer acá.'
                : 'Cuando haya una novedad sobre una orden, pago o soporte, la vas a encontrar acá.'}
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {items.map((notification) => {
              const category = notificationCategory(notification.type);
              const unread = !notification.readAt;
              return (
                <article key={notification.id} className={`${styles.item} ${unread ? styles.unread : ''}`}>
                  <button type="button" className={styles.itemButton} onClick={() => openNotification(notification)}>
                    <span className={`${styles.icon} ${categoryIconClass[category]}`}>
                      {notificationIcon(notification.type)}
                    </span>
                    <span className={styles.copy}>
                      <span className={styles.cardTop}>
                        <span className={`${styles.badge} ${categoryBadgeClass[category]}`}>
                          {categoryLabels[category]}
                        </span>
                        {unread && (
                          <span className={styles.unreadChip} aria-label="Sin leer">
                            {isAdmin ? 'Pendiente' : 'Nuevo'}
                          </span>
                        )}
                      </span>
                      <strong className={styles.title}>{notification.title}</strong>
                      <span className={styles.message}>{notification.message}</span>
                      <span className={styles.itemFooter}>
                        <time dateTime={notification.createdAt}>
                          <Clock3 size={13} aria-hidden="true" />
                          {formatDate(notification.createdAt)}
                        </time>
                        <span className={styles.openHint}>
                          {isAdmin ? 'Revisar' : 'Abrir'}
                          <ArrowRight size={13} aria-hidden="true" />
                        </span>
                      </span>
                    </span>
                  </button>
                  {unread && (
                    <button
                      type="button"
                      className={styles.readButton}
                      onClick={() => markRead.mutate(notification.id)}
                      disabled={markRead.isPending}
                    >
                      <Check size={14} aria-hidden="true" />
                      Marcar leída
                    </button>
                  )}
                </article>
              );
            })}
            {query.hasNextPage && (
              <Button variant="secondary" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? 'Cargando…' : 'Ver notificaciones anteriores'}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  </div>;
}
