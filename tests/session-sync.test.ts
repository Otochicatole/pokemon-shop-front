import { beforeEach, describe, expect, it, vi } from 'vitest';

type MessageListener = (event: { data: unknown }) => void;

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  readonly messages: unknown[] = [];
  readonly listeners = new Set<MessageListener>();
  closed = false;

  constructor(readonly name: string) { FakeBroadcastChannel.instances.push(this); }
  addEventListener(type: string, listener: MessageListener) { if (type === 'message') this.listeners.add(listener); }
  postMessage(message: unknown) { this.messages.push(message); }
  close() { this.closed = true; }
  emit(data: unknown) { for (const listener of this.listeners) listener({ data }); }
}

describe('cross-tab session sync', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeBroadcastChannel.instances = [];
    Object.defineProperty(window, 'BroadcastChannel', { configurable: true, writable: true, value: FakeBroadcastChannel });
  });

  it('delivers each remote event once and advances both changed and ended generations', async () => {
    const sync = await import('@/shared/auth/session-sync');
    const listener = vi.fn();
    const unsubscribe = sync.subscribeSessionSync(listener);
    const transport = FakeBroadcastChannel.instances[0];
    const changed = { version: 1, id: 'remote-change', source: 'other-tab', actor: 'user', action: 'changed', sentAt: 10 };
    const ended = { version: 1, id: 'remote-ended', source: 'other-tab', actor: 'user', action: 'ended', sentAt: 9 };

    transport.emit(changed);
    transport.emit(changed);
    transport.emit(ended);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, changed);
    expect(listener).toHaveBeenNthCalledWith(2, ended);
    expect(sync.getSessionSyncGeneration('user')).toBe(2);
    unsubscribe();
    expect(transport.closed).toBe(true);
  });

  it('publishes every explicit transition without debouncing and invalidates old requests', async () => {
    const sync = await import('@/shared/auth/session-sync');
    const unsubscribe = sync.subscribeSessionSync(() => undefined);
    const transport = FakeBroadcastChannel.instances[0];
    const requestGeneration = sync.getSessionSyncGeneration('admin');

    const ended = sync.publishSessionSync('admin', 'ended');
    const changed = sync.publishSessionSync('admin', 'changed');
    const endedAgain = sync.publishSessionSync('admin', 'ended');

    expect(transport.messages).toHaveLength(3);
    expect([ended?.action, changed?.action, endedAgain?.action]).toEqual(['ended', 'changed', 'ended']);
    expect(new Set([ended?.id, changed?.id, endedAgain?.id])).toHaveProperty('size', 3);
    expect(sync.getSessionSyncGeneration('admin')).toBe(requestGeneration + 3);
    expect(sync.isCurrentSessionRequest('admin', requestGeneration)).toBe(false);
    expect(sync.isCurrentSessionRequest('admin', sync.getSessionSyncGeneration('admin'))).toBe(true);
    unsubscribe();
  });

  it('uses the storage event fallback when BroadcastChannel is unavailable', async () => {
    Object.defineProperty(window, 'BroadcastChannel', { configurable: true, writable: true, value: undefined });
    const sync = await import('@/shared/auth/session-sync');
    const listener = vi.fn();
    const unsubscribe = sync.subscribeSessionSync(listener);
    const event = { version: 1, id: 'storage-event', source: 'other-tab', actor: 'user', action: 'ended', sentAt: 12 };

    window.dispatchEvent(new StorageEvent('storage', { key: sync.SESSION_SYNC_STORAGE_KEY, newValue: JSON.stringify(event) }));

    expect(listener).toHaveBeenCalledWith(event);
    unsubscribe();
  });
});
