import { apiFetch } from '@/shared/api/client';
import { adminFetch } from '@/shared/admin/client';
import {
  notificationListEnvelopeSchema,
  notificationReadAllEnvelopeSchema,
  notificationReadEnvelopeSchema,
  notificationUnreadEnvelopeSchema,
} from '../domain/contracts';

const PAGE_SIZE = 20;

function queryString(values: Record<string, string | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listNotifications(options: { cursor?: string; unreadOnly?: boolean } = {}) {
  const response = await apiFetch(`/notifications${queryString({ cursor: options.cursor, limit: String(PAGE_SIZE), unreadOnly: options.unreadOnly || undefined })}`, {}, notificationListEnvelopeSchema);
  return { data: response.data, nextCursor: response.meta.nextCursor };
}

export async function getNotificationUnreadCount() {
  const response = await apiFetch('/notifications/unread-count', {}, notificationUnreadEnvelopeSchema);
  return response.data.count;
}

export async function markNotificationRead(id: string) {
  const response = await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', body: '{}' }, notificationReadEnvelopeSchema);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await apiFetch('/notifications/read-all', { method: 'POST', body: '{}' }, notificationReadAllEnvelopeSchema);
  return response.data;
}

export async function listAdminNotifications(options: { cursor?: string; unreadOnly?: boolean } = {}) {
  const response = await adminFetch(`/admin/notifications${queryString({ cursor: options.cursor, limit: String(PAGE_SIZE), unreadOnly: options.unreadOnly || undefined })}`, {}, notificationListEnvelopeSchema);
  return { data: response.data, nextCursor: response.meta.nextCursor };
}

export async function getAdminNotificationUnreadCount() {
  const response = await adminFetch('/admin/notifications/unread-count', {}, notificationUnreadEnvelopeSchema);
  return response.data.count;
}

export async function markAdminNotificationRead(id: string) {
  const response = await adminFetch(`/admin/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', body: '{}' }, notificationReadEnvelopeSchema);
  return response.data;
}

export async function markAllAdminNotificationsRead() {
  const response = await adminFetch('/admin/notifications/read-all', { method: 'POST', body: '{}' }, notificationReadAllEnvelopeSchema);
  return response.data;
}
