import { describe, expect, it } from 'vitest';
import {
  parseSupportRealtimeEvent,
  supportEventAuthorType,
  supportEventConversationCreatorType,
  supportEventConversationId,
  supportEventMessagePreview,
  supportEventUnreadCount,
  supportSocketCloseAction,
} from '@/features/support-realtime/domain/events';

describe('support realtime events', () => {
  it('accepts a valid message envelope without treating its conversation count as global', () => {
    const event = parseSupportRealtimeEvent({
      type: 'support.message.created',
      payload: {
        conversationId: 'conversation-1',
        unreadCount: 4,
        message: { authorType: 'ADMIN', content: '  Ya revisamos tu caso.\nTe contamos cómo seguir.  ' },
      },
      sentAt: '2026-09-09T12:00:00.000Z',
    });

    expect(event).not.toBeNull();
    expect(supportEventUnreadCount(event!)).toBeNull();
    expect(supportEventConversationId(event!)).toBe('conversation-1');
    expect(supportEventAuthorType(event!)).toBe('ADMIN');
    expect(supportEventMessagePreview(event!)).toBe('Ya revisamos tu caso. Te contamos cómo seguir.');
  });

  it('only reads global unread counts from ready and unread-count events', () => {
    const ready = parseSupportRealtimeEvent({ type: 'connection.ready', payload: { unreadCount: 7 }, sentAt: '2026-09-09T12:00:00.000Z' });
    const updated = parseSupportRealtimeEvent({ type: 'support.unread_count', payload: { count: 5 }, sentAt: '2026-09-09T12:00:01.000Z' });
    const perConversation = parseSupportRealtimeEvent({ type: 'support.message.created', payload: { unreadCount: 2 }, sentAt: '2026-09-09T12:00:02.000Z' });

    expect(supportEventUnreadCount(ready!)).toBe(7);
    expect(supportEventUnreadCount(updated!)).toBe(5);
    expect(supportEventUnreadCount(perConversation!)).toBeNull();
  });

  it('identifies who opened a new conversation', () => {
    const event = parseSupportRealtimeEvent({
      type: 'support.conversation.created',
      payload: { conversation: { id: 'conversation-2', createdByType: 'ADMIN' } },
      sentAt: '2026-09-09T12:00:00.000Z',
    });
    expect(supportEventConversationId(event!)).toBe('conversation-2');
    expect(supportEventConversationCreatorType(event!)).toBe('ADMIN');
  });

  it('rejects malformed envelopes and unsafe unread counts', () => {
    expect(parseSupportRealtimeEvent({ type: 'support.unread_count', payload: {} })).toBeNull();
    const event = parseSupportRealtimeEvent({ type: 'support.unread_count', payload: { count: -1 }, sentAt: 'now' });
    expect(event).not.toBeNull();
    expect(supportEventUnreadCount(event!)).toBeNull();
  });

  it('falls back for the connection cap and refreshes auth for an expired socket session', () => {
    expect(supportSocketCloseAction(4008)).toBe('fallback');
    expect(supportSocketCloseAction(1008)).toBe('refresh-session');
    expect(supportSocketCloseAction(4001)).toBe('refresh-session');
    expect(supportSocketCloseAction(1006)).toBe('reconnect');
  });
});
