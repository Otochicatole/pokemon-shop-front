import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportRealtimeProvider } from '@/features/support-realtime/ui/support-realtime-provider';
import { getSessionSyncGeneration, publishSessionSync } from '@/shared/auth/session-sync';

const mocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  getAdminMe: vi.fn(),
  apiFetch: vi.fn(),
  adminFetch: vi.fn(),
  resetCsrf: vi.fn(),
  resetAdminCsrf: vi.fn(),
  playSound: vi.fn(),
  unlockSound: vi.fn(),
  toast: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => {
  const router = { push: mocks.push, replace: mocks.replace, refresh: mocks.refresh };
  return { usePathname: () => '/account/support', useRouter: () => router };
});
vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@/features/auth/infrastructure/api', () => ({ getMe: mocks.getMe }));
vi.mock('@/features/admin-auth/infrastructure/api', () => ({ getAdminMe: mocks.getAdminMe }));
vi.mock('@/shared/api/client', () => ({ apiFetch: mocks.apiFetch, resetCsrf: mocks.resetCsrf }));
vi.mock('@/shared/admin/client', () => ({ adminFetch: mocks.adminFetch, resetAdminCsrf: mocks.resetAdminCsrf }));
vi.mock('@/features/support-realtime/infrastructure/notification-sound', () => ({
  playSupportNotificationSound: mocks.playSound,
  unlockSupportNotificationSound: mocks.unlockSound,
}));

interface FakeSocketEvent { data?: unknown; code?: number }
type FakeSocketListener = (event: FakeSocketEvent) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  private readonly listeners = new Map<string, Set<FakeSocketListener>>();

  constructor(readonly url: string) { FakeWebSocket.instances.push(this); }
  addEventListener(type: string, listener: FakeSocketListener) {
    const listeners = this.listeners.get(type) ?? new Set<FakeSocketListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  close() { this.emit('close', { code: 1000 }); }
  emit(type: string, event: FakeSocketEvent) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe('support realtime socket isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    mocks.apiFetch.mockResolvedValue({ data: { count: 0 } });
    mocks.adminFetch.mockResolvedValue({ data: { count: 0 } });
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('ignores queued messages from the previous actor before and after socket cleanup', async () => {
    const userA = { id: 'user-a', email: 'a@example.test', name: 'A', emailVerified: true };
    const userB = { id: 'user-b', email: 'b@example.test', name: 'B', emailVerified: true };
    mocks.getMe.mockResolvedValue(userA);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(['me'], userA);
    const view = render(<QueryClientProvider client={client}><SupportRealtimeProvider><div>Contenido</div></SupportRealtimeProvider></QueryClientProvider>);
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const oldSocket = FakeWebSocket.instances[0];
    const delayedMessage = {
      data: JSON.stringify({
        type: 'support.message.created',
        payload: { conversationId: 'private-a', message: { senderType: 'ADMIN', content: 'Mensaje privado para A' } },
        sentAt: '2026-09-10T00:00:00.000Z',
      }),
    };

    act(() => {
      publishSessionSync('user', 'changed');
      client.setQueryData(['me'], userB);
      oldSocket.emit('message', delayedMessage);
    });
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    act(() => { oldSocket.emit('message', delayedMessage); });

    expect(mocks.playSound).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
    view.unmount();
  });

  it('clears private data before revalidating a session-revoked socket', async () => {
    const userA = { id: 'user-a', email: 'a@example.test', name: 'A', emailVerified: true };
    const userB = { id: 'user-b', email: 'b@example.test', name: 'B', emailVerified: true };
    mocks.getMe.mockResolvedValue(userA);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(['me'], userA);
    client.setQueryData(['support', 'conversation', 'private-a'], { private: 'Cuenta A' });
    client.setQueryData(['orders'], { private: 'Cuenta A' });
    const view = render(<QueryClientProvider client={client}><SupportRealtimeProvider><div>Contenido</div></SupportRealtimeProvider></QueryClientProvider>);
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    mocks.getMe.mockResolvedValue(userB);
    const socketGeneration = getSessionSyncGeneration('user');

    act(() => { FakeWebSocket.instances[0].emit('close', { code: 4001 }); });

    expect(getSessionSyncGeneration('user')).toBe(socketGeneration + 1);
    expect(client.getQueryData(['support', 'conversation', 'private-a'])).toBeUndefined();
    expect(client.getQueryData(['orders'])).toBeUndefined();
    await waitFor(() => expect(client.getQueryData(['me'])).toEqual(userB));
    expect(mocks.resetCsrf).toHaveBeenCalled();
    view.unmount();
  });

  it('advances the local epoch once for a current 401 and ignores stale repeats', async () => {
    const user = { id: 'user-a', email: 'a@example.test', name: 'A', emailVerified: true };
    mocks.getMe.mockResolvedValue(user);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(['me'], user);
    client.setQueryData(['support', 'conversations'], { private: 'Cuenta A' });
    const view = render(<QueryClientProvider client={client}><SupportRealtimeProvider><div>Contenido</div></SupportRealtimeProvider></QueryClientProvider>);
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const requestGeneration = getSessionSyncGeneration('user');

    act(() => {
      window.dispatchEvent(new CustomEvent('card-shop:user-unauthorized', { detail: { sessionGeneration: requestGeneration } }));
    });

    expect(getSessionSyncGeneration('user')).toBe(requestGeneration + 1);
    expect(client.getQueryData(['me'])).toBeNull();
    expect(client.getQueryData(['support', 'conversations'])).toBeUndefined();
    act(() => {
      window.dispatchEvent(new CustomEvent('card-shop:user-unauthorized', { detail: { sessionGeneration: requestGeneration } }));
    });
    expect(getSessionSyncGeneration('user')).toBe(requestGeneration + 1);
    view.unmount();
  });
});
