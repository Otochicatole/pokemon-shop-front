import { adminFetch } from '@/shared/admin/client';
import { fullRefundEnvelopeSchema, orderDetailEnvelopeSchema, orderListEnvelopeSchema, orderStatusEnvelopeSchema, transferReviewEnvelopeSchema, type AdminOrder } from '../domain/contracts';

export interface OrderQuery { search?: string; status?: string; paymentMethod?: string; paymentStatus?: string; fulfillmentType?: string; from?: string; to?: string; cursor?: string; limit?: number; queue?: string }
export async function listAdminOrders(query: OrderQuery, payments = false): Promise<{ data: AdminOrder[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    if ((key === 'from' || key === 'to') && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      params.set(key, new Date(`${value}T${key === 'to' ? '23:59:59.999' : '00:00:00.000'}`).toISOString());
      return;
    }
    params.set(key, String(value));
  });
  const response = await adminFetch(`${payments ? '/admin/payments' : '/admin/orders'}?${params}`, {}, orderListEnvelopeSchema);
  return { data: response.data, nextCursor: response.meta.nextCursor };
}
export async function getAdminOrder(number: string) { const response = await adminFetch(`/admin/orders/${encodeURIComponent(number)}`, {}, orderDetailEnvelopeSchema); return response.data.order; }
export async function cancelAdminOrder(number: string, expectedVersion: number, note?: string) { return adminFetch(`/admin/orders/${encodeURIComponent(number)}/cancel`, { method: 'POST', body: JSON.stringify({ expectedVersion, note: note || undefined }) }, orderStatusEnvelopeSchema); }
export async function transitionAdminOrder(number: string, expectedVersion: number, status: string, note?: string) { return adminFetch(`/admin/orders/${encodeURIComponent(number)}/transition`, { method: 'POST', body: JSON.stringify({ expectedVersion, status, note: note || undefined }) }, orderStatusEnvelopeSchema); }
export async function reviewTransfer(number: string, receiptId: string, expectedVersion: number, decision: 'approve' | 'reject', note?: string) { return adminFetch(`/admin/orders/${encodeURIComponent(number)}/transfer-receipts/${receiptId}/${decision}`, { method: 'POST', body: JSON.stringify({ expectedVersion, note: note || undefined }) }, transferReviewEnvelopeSchema); }
export async function fulfillLatePayment(number: string, expectedVersion: number) { return adminFetch(`/admin/orders/${encodeURIComponent(number)}/late-payment/fulfill`, { method: 'POST', body: JSON.stringify({ expectedVersion }) }, orderStatusEnvelopeSchema); }
export async function recordFullRefund(number: string, expectedVersion: number, reason: string, externalReference: string) { return adminFetch(`/admin/orders/${encodeURIComponent(number)}/refund`, { method: 'POST', body: JSON.stringify({ expectedVersion, reason, externalReference }) }, fullRefundEnvelopeSchema); }
