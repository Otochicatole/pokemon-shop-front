import { adminFetch } from '@/shared/admin/client';
import {
  adminSupportConversationDetailEnvelopeSchema,
  adminSupportConversationEnvelopeSchema,
  adminSupportConversationListEnvelopeSchema,
  adminSupportMessageEnvelopeSchema,
  adminSupportReadEnvelopeSchema,
  adminSupportUnreadEnvelopeSchema,
  type CreateAdminSupportConversationInput,
  type SupportConversationStatus,
} from '../domain/contracts';

export interface AdminSupportConversationQuery {
  status?: SupportConversationStatus | '';
  cursor?: string;
  limit?: number;
}

function queryString(values: object) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : '';
}

export async function listAdminSupportConversations(query: AdminSupportConversationQuery = {}) {
  const response = await adminFetch(
    `/admin/support/conversations${queryString(query)}`,
    {},
    adminSupportConversationListEnvelopeSchema,
  );
  return { data: response.data, nextCursor: response.meta.nextCursor };
}

export async function getAdminSupportConversation(id: string, cursor?: string) {
  const response = await adminFetch(
    `/admin/support/conversations/${encodeURIComponent(id)}${queryString({ cursor, limit: 50 })}`,
    {},
    adminSupportConversationDetailEnvelopeSchema,
  );
  return {
    conversation: response.data.conversation,
    messages: response.data.messages,
    nextCursor: response.meta.nextCursor,
  };
}

export async function createAdminSupportConversation(input: CreateAdminSupportConversationInput) {
  const response = await adminFetch(
    '/admin/support/conversations',
    { method: 'POST', body: JSON.stringify(input) },
    adminSupportConversationEnvelopeSchema,
  );
  return response.data.conversation;
}

export async function sendAdminSupportMessage(conversationId: string, content: string, clientMessageId: string) {
  const response = await adminFetch(
    `/admin/support/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', body: JSON.stringify({ content, clientMessageId }) },
    adminSupportMessageEnvelopeSchema,
  );
  return response.data.message;
}

export async function markAdminSupportConversationRead(conversationId: string, messageId?: string) {
  const response = await adminFetch(
    `/admin/support/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'POST', body: JSON.stringify(messageId ? { messageId } : {}) },
    adminSupportReadEnvelopeSchema,
  );
  return response.data;
}

export async function updateAdminSupportConversationStatus(conversationId: string, status: SupportConversationStatus) {
  const response = await adminFetch(
    `/admin/support/conversations/${encodeURIComponent(conversationId)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    adminSupportConversationEnvelopeSchema,
  );
  return response.data.conversation;
}

export async function getAdminSupportUnreadCount() {
  const response = await adminFetch('/admin/support/unread-count', {}, adminSupportUnreadEnvelopeSchema);
  return response.data.count;
}
