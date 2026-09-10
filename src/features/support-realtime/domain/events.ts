export type SupportRealtimeRole = 'user' | 'admin';

export type SupportConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting';
export type SupportSocketCloseAction = 'fallback' | 'refresh-session' | 'reconnect';

export interface SupportRealtimeEvent {
  type:
    | 'connection.ready'
    | 'support.conversation.created'
    | 'support.message.created'
    | 'support.conversation.read'
    | 'support.conversation.status_changed'
    | 'support.unread_count'
    | string;
  payload: Record<string, unknown>;
  sentAt: string;
}

export function parseSupportRealtimeEvent(value: unknown): SupportRealtimeEvent | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.type !== 'string' || !candidate.payload || typeof candidate.payload !== 'object' || typeof candidate.sentAt !== 'string') return null;
  return { type: candidate.type, payload: candidate.payload as Record<string, unknown>, sentAt: candidate.sentAt };
}

export function supportEventUnreadCount(event: SupportRealtimeEvent): number | null {
  const raw = event.type === 'support.unread_count'
    ? event.payload.count
    : event.type === 'connection.ready'
      ? event.payload.supportUnreadCount ?? event.payload.unreadCount
      : null;
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
}

export function notificationEventUnreadCount(event: SupportRealtimeEvent): number | null {
  const raw = event.type === 'notifications.unread_count' || event.type === 'notification.created'
    ? event.payload.count ?? event.payload.unreadCount
    : event.type === 'connection.ready'
      ? event.payload.notificationUnreadCount
      : null;
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
}

export function notificationEventPayload(event: SupportRealtimeEvent) {
  const notification = event.payload.notification;
  return notification && typeof notification === 'object' ? notification as Record<string, unknown> : null;
}

export function supportEventConversationId(event: SupportRealtimeEvent): string | null {
  const direct = event.payload.conversationId;
  if (typeof direct === 'string' && direct.length > 0) return direct;
  const conversation = event.payload.conversation;
  if (conversation && typeof conversation === 'object') {
    const id = (conversation as Record<string, unknown>).id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return null;
}

export function supportEventConversationCreatorType(event: SupportRealtimeEvent): string | null {
  const conversation = event.payload.conversation;
  if (!conversation || typeof conversation !== 'object') return null;
  const creatorType = (conversation as Record<string, unknown>).createdByType;
  return typeof creatorType === 'string' ? creatorType.toUpperCase() : null;
}

export function supportEventAuthorType(event: SupportRealtimeEvent): string | null {
  const message = event.payload.message;
  if (!message || typeof message !== 'object') return null;
  const record = message as Record<string, unknown>;
  const direct = record.authorType ?? record.senderType ?? record.actorType;
  if (typeof direct === 'string') return direct.toUpperCase();
  const author = record.author ?? record.sender;
  if (author && typeof author === 'object') {
    const nested = (author as Record<string, unknown>).type;
    if (typeof nested === 'string') return nested.toUpperCase();
  }
  return null;
}

export function supportEventMessagePreview(event: SupportRealtimeEvent): string | null {
  const message = event.payload.message;
  if (!message || typeof message !== 'object') return null;
  const record = message as Record<string, unknown>;
  const content = record.content ?? record.body ?? record.text;
  if (typeof content !== 'string') return null;
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.length > 90 ? `${normalized.slice(0, 87)}…` : normalized;
}

export function supportSocketCloseAction(code: number): SupportSocketCloseAction {
  if (code === 4008) return 'fallback';
  if (code === 1008 || code === 4001) return 'refresh-session';
  return 'reconnect';
}
