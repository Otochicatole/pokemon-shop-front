import { apiFetch } from '@/shared/api/client';
import {
  supportConversationEnvelopeSchema,
  supportCreatedEnvelopeSchema,
  supportListEnvelopeSchema,
  supportMessageEnvelopeSchema,
  supportReadEnvelopeSchema,
  supportUnreadEnvelopeSchema,
  type CreateSupportConversationInput,
  type SupportConversationStatus,
} from '../domain/contracts';

const PAGE_SIZE = 20;

export async function listSupportConversations(options: { cursor?: string; status?: SupportConversationStatus } = {}) {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.status) params.set('status', options.status);
  const response = await apiFetch(`/support/conversations?${params}`, {}, supportListEnvelopeSchema);
  return { conversations: response.data, nextCursor: response.meta.nextCursor };
}

export async function createSupportConversation(input: CreateSupportConversationInput) {
  const response = await apiFetch('/support/conversations', {
    method: 'POST',
    body: JSON.stringify(input),
  }, supportCreatedEnvelopeSchema);
  return response.data.conversation;
}

export async function getSupportConversation(id: string, cursor?: string) {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) params.set('cursor', cursor);
  const response = await apiFetch(`/support/conversations/${encodeURIComponent(id)}?${params}`, {}, supportConversationEnvelopeSchema);
  return { ...response.data, nextCursor: response.meta.nextCursor };
}

export async function sendSupportMessage(id: string, content: string, clientMessageId: string) {
  const response = await apiFetch(`/support/conversations/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, clientMessageId }),
  }, supportMessageEnvelopeSchema);
  return response.data.message;
}

export async function markSupportConversationRead(id: string, messageId?: string) {
  const response = await apiFetch(`/support/conversations/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    body: JSON.stringify(messageId ? { messageId } : {}),
  }, supportReadEnvelopeSchema);
  return response.data;
}

export async function getSupportUnreadCount() {
  const response = await apiFetch('/support/unread-count', {}, supportUnreadEnvelopeSchema);
  return response.data.count;
}
