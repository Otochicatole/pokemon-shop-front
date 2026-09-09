import { adminFetch } from '@/shared/admin/client';
import { customerDetailEnvelopeSchema, customerListEnvelopeSchema, customerOrderListEnvelopeSchema, type AdminCustomer } from '../domain/contracts';

export interface CustomerQuery { search?: string; status?: string; verified?: string; cursor?: string; limit?: number }
export async function listAdminCustomers(query: CustomerQuery): Promise<{ data: AdminCustomer[]; nextCursor: string | null }> { const params = new URLSearchParams(); Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); }); const response = await adminFetch(`/admin/customers?${params}`, {}, customerListEnvelopeSchema); return { data: response.data, nextCursor: response.meta.nextCursor }; }
export async function getAdminCustomer(id: string) { const response = await adminFetch(`/admin/customers/${id}`, {}, customerDetailEnvelopeSchema); return response.data.customer; }
export async function listAdminCustomerOrders(id: string, cursor?: string) {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const response = await adminFetch(`/admin/customers/${id}/orders?${params}`, {}, customerOrderListEnvelopeSchema);
  return { data: response.data, nextCursor: response.meta.nextCursor };
}
