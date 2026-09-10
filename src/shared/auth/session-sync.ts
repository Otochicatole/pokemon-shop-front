export type SessionSyncActor = 'user' | 'admin';
export type SessionSyncAction = 'ended' | 'changed';

export interface SessionSyncEvent {
  version: 1;
  id: string;
  source: string;
  actor: SessionSyncActor;
  action: SessionSyncAction;
  sentAt: number;
}

const CHANNEL_NAME = 'card-shop:session-sync:v1';
export const SESSION_SYNC_STORAGE_KEY = `${CHANNEL_NAME}:event`;
const MAX_SEEN_EVENTS = 100;

function uuid() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === 'function') cryptoApi.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

const sourceId = uuid();
const listeners = new Set<(event: SessionSyncEvent) => void>();
const seenIds = new Set<string>();
const seenOrder: string[] = [];
const sessionGenerations: Record<SessionSyncActor, number> = { user: 0, admin: 0 };
let channel: BroadcastChannel | null = null;
let listeningToStorage = false;

function isSessionSyncEvent(value: unknown): value is SessionSyncEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<SessionSyncEvent>;
  return event.version === 1
    && typeof event.id === 'string'
    && typeof event.source === 'string'
    && (event.actor === 'user' || event.actor === 'admin')
    && (event.action === 'ended' || event.action === 'changed')
    && typeof event.sentAt === 'number'
    && Number.isFinite(event.sentAt);
}

function remember(id: string) {
  if (seenIds.has(id)) return false;
  seenIds.add(id);
  seenOrder.push(id);
  if (seenOrder.length > MAX_SEEN_EVENTS) {
    const oldest = seenOrder.shift();
    if (oldest) seenIds.delete(oldest);
  }
  return true;
}

function deliver(value: unknown) {
  if (!isSessionSyncEvent(value) || value.source === sourceId || !remember(value.id)) return;
  sessionGenerations[value.actor] += 1;
  for (const listener of listeners) listener(value);
}

function onStorage(event: StorageEvent) {
  if (event.key !== SESSION_SYNC_STORAGE_KEY || !event.newValue) return;
  try { deliver(JSON.parse(event.newValue)); } catch { /* Ignore malformed events from storage. */ }
}

function startListening() {
  if (typeof window === 'undefined' || channel || listeningToStorage) return;
  if (typeof window.BroadcastChannel === 'function') {
    try {
      channel = new window.BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message', (event) => deliver(event.data));
      return;
    } catch { /* Fall through to the storage-event transport. */ }
  }
  window.addEventListener('storage', onStorage);
  listeningToStorage = true;
}

function stopListening() {
  channel?.close();
  channel = null;
  if (listeningToStorage && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  listeningToStorage = false;
}

export function subscribeSessionSync(listener: (event: SessionSyncEvent) => void) {
  listeners.add(listener);
  startListening();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopListening();
  };
}

export function publishSessionSync(actor: SessionSyncActor, action: SessionSyncAction) {
  if (typeof window === 'undefined') return null;
  const now = Date.now();
  const event: SessionSyncEvent = { version: 1, id: uuid(), source: sourceId, actor, action, sentAt: now };
  remember(event.id);
  sessionGenerations[actor] += 1;

  if (channel) {
    channel.postMessage(event);
    return event;
  }
  if (typeof window.BroadcastChannel === 'function') {
    try {
      const publisher = new window.BroadcastChannel(CHANNEL_NAME);
      publisher.postMessage(event);
      publisher.close();
      return event;
    } catch { /* Fall through to localStorage. */ }
  }
  try {
    window.localStorage.setItem(SESSION_SYNC_STORAGE_KEY, JSON.stringify(event));
    window.localStorage.removeItem(SESSION_SYNC_STORAGE_KEY);
  } catch { /* Session cleanup still succeeds when cross-tab storage is unavailable. */ }
  return event;
}

export function getSessionSyncGeneration(actor: SessionSyncActor) {
  return sessionGenerations[actor];
}

export function advanceSessionGeneration(actor: SessionSyncActor) {
  sessionGenerations[actor] += 1;
  return sessionGenerations[actor];
}

export function isCurrentSessionRequest(actor: SessionSyncActor, requestGeneration: unknown) {
  return typeof requestGeneration !== 'number' || requestGeneration === sessionGenerations[actor];
}

export function isSessionChangedError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const problem = (error as { problem?: unknown }).problem;
  return Boolean(problem && typeof problem === 'object' && (problem as { code?: unknown }).code === 'SESSION_CHANGED');
}
