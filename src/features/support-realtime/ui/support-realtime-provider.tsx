'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/feedback';
import { getMe } from '@/features/auth/infrastructure/api';
import { RealtimeNotificationToast } from './realtime-notification-toast';
import { markUserSessionEnded, refreshUserSessionFromCookie } from '@/features/auth/application/session-cache';
import { getAdminMe } from '@/features/admin-auth/infrastructure/api';
import { markAdminSessionEnded, refreshAdminSessionFromCookie } from '@/features/admin-auth/application/session-cache';
import { apiFetch, resetCsrf } from '@/shared/api/client';
import { adminFetch, resetAdminCsrf } from '@/shared/admin/client';
import { advanceSessionGeneration, getSessionSyncGeneration, isCurrentSessionRequest, subscribeSessionSync } from '@/shared/auth/session-sync';
import {
  parseSupportRealtimeEvent,
  supportEventUnreadCount,
  notificationEventUnreadCount,
  notificationEventPayload,
  supportSocketCloseAction,
  type SupportConnectionState,
  type SupportRealtimeRole,
} from '../domain/events';
import { playSupportNotificationSound, unlockSupportNotificationSound } from '../infrastructure/notification-sound';
import { getNotificationUnreadCount, getAdminNotificationUnreadCount } from '@/features/notifications/infrastructure/api';
import { apiRequestUrl } from '@/shared/config/env';

interface SupportRealtimeContextValue {
  role: SupportRealtimeRole;
  authenticated: boolean;
  unreadCount: number;
  notificationUnreadCount: number;
  connectionState: SupportConnectionState;
}

const SupportRealtimeContext = createContext<SupportRealtimeContextValue>({
  role: 'user',
  authenticated: false,
  unreadCount: 0,
  notificationUnreadCount: 0,
  connectionState: 'idle',
});

function websocketUrl(role: SupportRealtimeRole) {
  const url = new URL(apiRequestUrl('/notifications/ws'));
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('role', role);
  return url.toString();
}

async function unreadCount(role: SupportRealtimeRole) {
  const response = role === 'admin'
    ? await adminFetch<{ data: { count: number } }>('/admin/support/unread-count')
    : await apiFetch<{ data: { count: number } }>('/support/unread-count');
  return response.data.count;
}

function sessionActorId(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

export function SupportRealtimeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const role: SupportRealtimeRole = pathname.startsWith('/admin') ? 'admin' : 'user';
  const [connectionState, setConnectionState] = useState<SupportConnectionState>('idle');
  const unreadKey = useMemo(() => ['support-realtime', role, 'unread-count'] as const, [role]);
  const unreadRef = useRef(0);
  const notificationUnreadRef = useRef(0);

  const session = useQuery<unknown>({
    queryKey: role === 'admin' ? ['admin', 'session'] : ['me'],
    queryFn: async (): Promise<unknown> => role === 'admin' ? getAdminMe() : getMe(),
    retry: false,
    staleTime: 30_000,
  });
  const authenticated = Boolean(session.data);
  const actorId = sessionActorId(session.data);
  const unread = useQuery({
    queryKey: unreadKey,
    queryFn: () => unreadCount(role),
    enabled: authenticated,
    retry: false,
    refetchInterval: 45_000,
  });
  const currentUnreadCount = authenticated ? (unread.data ?? 0) : 0;
  const notificationUnread = useQuery({
    queryKey: ['notifications', role, 'unread-count'],
    queryFn: () => role === 'admin' ? getAdminNotificationUnreadCount() : getNotificationUnreadCount(),
    enabled: authenticated,
    retry: false,
    refetchInterval: 45_000,
  });
  const currentNotificationUnreadCount = authenticated ? (notificationUnread.data ?? 0) : 0;

  useEffect(() => { unreadRef.current = currentUnreadCount; }, [currentUnreadCount]);
  useEffect(() => { notificationUnreadRef.current = currentNotificationUnreadCount; }, [currentNotificationUnreadCount]);

  useEffect(() => {
    const userUnauthorized = (event: Event) => {
      const requestGeneration = (event as CustomEvent<{ sessionGeneration?: unknown }>).detail?.sessionGeneration;
      if (!isCurrentSessionRequest('user', requestGeneration)) return;
      advanceSessionGeneration('user');
      resetCsrf();
      markUserSessionEnded(queryClient);
    };
    const adminUnauthorized = (event: Event) => {
      const requestGeneration = (event as CustomEvent<{ sessionGeneration?: unknown }>).detail?.sessionGeneration;
      if (!isCurrentSessionRequest('admin', requestGeneration)) return;
      advanceSessionGeneration('admin');
      resetAdminCsrf();
      markAdminSessionEnded(queryClient);
      if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        router.replace('/admin/login');
        router.refresh();
      }
    };
    window.addEventListener('card-shop:user-unauthorized', userUnauthorized);
    window.addEventListener('card-shop:admin-unauthorized', adminUnauthorized);
    return () => {
      window.removeEventListener('card-shop:user-unauthorized', userUnauthorized);
      window.removeEventListener('card-shop:admin-unauthorized', adminUnauthorized);
    };
  }, [pathname, queryClient, router]);

  useEffect(() => subscribeSessionSync((event) => {
    if (event.actor === 'user') {
      resetCsrf();
      void refreshUserSessionFromCookie(queryClient);
      return;
    }
    resetAdminCsrf();
    void refreshAdminSessionFromCookie(queryClient);
  }), [queryClient]);

  useEffect(() => {
    const unlock = () => { void unlockSupportNotificationSound(); };
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    let stopped = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    const connect = () => {
      if (stopped) return;
      setConnectionState(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
      const socketGeneration = getSessionSyncGeneration(role);
      const activeSocket = new WebSocket(websocketUrl(role));
      socket = activeSocket;
      activeSocket.addEventListener('open', () => {
        if (stopped || socket !== activeSocket || getSessionSyncGeneration(role) !== socketGeneration) return;
        reconnectAttempt = 0;
        setConnectionState('connected');
      });
      activeSocket.addEventListener('message', (messageEvent) => {
        if (stopped || socket !== activeSocket || getSessionSyncGeneration(role) !== socketGeneration) return;
        let decoded: unknown;
        try { decoded = JSON.parse(String(messageEvent.data)); } catch { return; }
        const event = parseSupportRealtimeEvent(decoded);
        if (!event) return;

        const nextUnreadCount = supportEventUnreadCount(event);
        if (nextUnreadCount !== null) {
          unreadRef.current = nextUnreadCount;
          queryClient.setQueryData(unreadKey, nextUnreadCount);
        }
        const nextNotificationUnreadCount = notificationEventUnreadCount(event);
        if (nextNotificationUnreadCount !== null) {
          notificationUnreadRef.current = nextNotificationUnreadCount;
          queryClient.setQueryData(['notifications', role, 'unread-count'], nextNotificationUnreadCount);
        }
        if (event.type === 'connection.ready') {
          void queryClient.invalidateQueries({ queryKey: unreadKey, exact: true });
          void queryClient.invalidateQueries({ queryKey: ['notifications', role, 'unread-count'], exact: true });
        }

        if (event.type === 'connection.ready' || (event.type.startsWith('support.') && event.type !== 'support.unread_count')) {
          void queryClient.invalidateQueries({ queryKey: role === 'admin' ? ['admin', 'support'] : ['support'] });
        }

        if (event.type === 'notification.created') {
          void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          const payload = notificationEventPayload(event);
          const reference = payload?.reference && typeof payload.reference === 'object'
            ? payload.reference as Record<string, unknown>
            : null;
          const notificationsPath = role === 'admin' ? '/admin/notifications' : '/account/notifications';
          let href = notificationsPath;
          if (reference?.kind === 'ORDER' && typeof reference.orderNumber === 'string') {
            href = `${role === 'admin' ? '/admin/orders' : '/account/orders'}/${encodeURIComponent(reference.orderNumber)}`;
          } else if (reference?.kind === 'SUPPORT_CONVERSATION' && typeof reference.conversationId === 'string') {
            href = `${role === 'admin' ? '/admin/support' : '/account/support'}/${encodeURIComponent(reference.conversationId)}`;
          } else if (reference?.kind === 'SELLER_ORDER' && typeof reference.sellerOrderId === 'string') {
            href = role === 'admin'
              ? `/admin/affiliates/orders/${encodeURIComponent(reference.sellerOrderId)}`
              : '/affiliate/orders';
          } else if (reference?.kind === 'AFFILIATE_LISTING' && typeof reference.listingId === 'string') {
            href = role === 'admin'
              ? `/admin/affiliates/listings/${encodeURIComponent(reference.listingId)}`
              : '/affiliate/listings';
          } else if (reference?.kind === 'AFFILIATE_PAYOUT' && typeof reference.payoutId === 'string') {
            href = role === 'admin'
              ? `/admin/affiliates/payouts/${encodeURIComponent(reference.payoutId)}`
              : '/affiliate/balance';
          }
          if (reference?.kind === 'ORDER' && typeof reference.orderNumber === 'string') {
            void queryClient.invalidateQueries({ queryKey: ['orders'] });
            void queryClient.invalidateQueries({ queryKey: ['order', reference.orderNumber] });
          }
          playSupportNotificationSound();
          const title = String(payload?.title ?? 'Nueva notificación');
          const message = typeof payload?.message === 'string' ? payload.message : 'Tenés una novedad para revisar.';
          const type = typeof payload?.type === 'string' ? payload.type : undefined;
          toast.custom(
            (id) => (
              <RealtimeNotificationToast
                title={title}
                message={message}
                type={type}
                variant={role === 'admin' ? 'admin' : 'store'}
                onOpen={() => {
                  toast.dismiss(id);
                  router.push(href);
                }}
              />
            ),
            { duration: 6500, unstyled: true },
          );
          return;
        }

      });
      activeSocket.addEventListener('close', (event) => {
        if (stopped || socket !== activeSocket || getSessionSyncGeneration(role) !== socketGeneration) return;
        const action = supportSocketCloseAction(event.code);
        if (action === 'fallback') {
          setConnectionState('idle');
          return;
        }
        if (action === 'refresh-session') {
          setConnectionState('idle');
          if (role === 'admin') {
            advanceSessionGeneration('admin');
            resetAdminCsrf();
            void refreshAdminSessionFromCookie(queryClient);
          } else {
            advanceSessionGeneration('user');
            resetCsrf();
            void refreshUserSessionFromCookie(queryClient);
          }
          return;
        }
        reconnectAttempt += 1;
        setConnectionState('reconnecting');
        const delay = Math.min(30_000, 1_000 * 2 ** Math.min(reconnectAttempt - 1, 5));
        reconnectTimer = setTimeout(connect, delay);
      });
      activeSocket.addEventListener('error', () => {
        if (stopped || socket !== activeSocket || getSessionSyncGeneration(role) !== socketGeneration) return;
        activeSocket.close();
      });
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      setConnectionState('idle');
    };
  }, [actorId, authenticated, queryClient, role, router, unreadKey]);

  const value = useMemo<SupportRealtimeContextValue>(() => ({
    role,
    authenticated,
    unreadCount: currentUnreadCount,
    notificationUnreadCount: currentNotificationUnreadCount,
    connectionState: authenticated ? connectionState : 'idle',
  }), [authenticated, connectionState, currentUnreadCount, currentNotificationUnreadCount, role]);

  return <SupportRealtimeContext.Provider value={value}>{children}</SupportRealtimeContext.Provider>;
}

export function useSupportRealtime() {
  return useContext(SupportRealtimeContext);
}
