import { adminFetch } from '@/shared/admin/client';
import { apiFetch } from '@/shared/api/client';
import { adminNewsDetailEnvelopeSchema, adminNewsListEnvelopeSchema, publicNewsListSchema, type AdminNews, type NewsFormValues } from '../domain/contracts';

export async function listPublicNews() {
  return apiFetch('/news', {}, publicNewsListSchema);
}

export interface AdminNewsQuery { search?: string; active?: string; cursor?: string; limit?: number; }

export async function listAdminNews(query: AdminNewsQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return adminFetch(`/admin/news?${params.toString()}`, {}, adminNewsListEnvelopeSchema);
}

function datePayload(value: string) {
  if (!value.trim()) return null;
  return new Date(`${value}Z`).toISOString();
}

function newsPayload(values: NewsFormValues, includeActive = true) {
  return {
    title: values.title.trim(), summary: values.summary.trim(), sortOrder: values.sortOrder,
    ...(includeActive ? { active: values.active } : {}),
    startsAt: datePayload(values.startsAt), endsAt: datePayload(values.endsAt),
  };
}

export async function createAdminNews(values: NewsFormValues) {
  const response = await adminFetch('/admin/news', { method: 'POST', body: JSON.stringify(newsPayload(values, false)) }, adminNewsDetailEnvelopeSchema);
  return response.data.news;
}

export async function updateAdminNews(id: string, version: number, values: NewsFormValues) {
  const response = await adminFetch(`/admin/news/${id}`, { method: 'PATCH', body: JSON.stringify({ ...newsPayload(values), expectedVersion: version }) }, adminNewsDetailEnvelopeSchema);
  return response.data.news;
}

export async function deleteAdminNews(id: string, version: number) {
  return adminFetch(`/admin/news/${id}`, { method: 'DELETE', body: JSON.stringify({ expectedVersion: version }) });
}

export type { AdminNews };
