import { apiFetch } from '@/shared/api/client';
import { orderSchema, type Order } from '@/shared/api/contracts';
export async function listOrders(cursor?: string) { const response = await apiFetch(`/orders?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`) as { data: unknown[]; meta: { nextCursor: string | null } }; return { data: response.data.map((entry) => orderSchema.parse(entry)), nextCursor: response.meta.nextCursor }; }
export async function getOrder(number: string): Promise<Order> { const response = await apiFetch(`/orders/${encodeURIComponent(number)}`, { cache: 'no-store' }) as { data: { order: unknown } }; return orderSchema.parse(response.data.order); }
export async function refreshOrderPaymentStatus(number: string) { await apiFetch(`/orders/${encodeURIComponent(number)}/payment-status/refresh`, { method: 'POST' }); }
export async function cancelOrder(number: string) { return apiFetch(`/orders/${encodeURIComponent(number)}/cancel`, { method: 'POST' }); }
export async function confirmSellerOrder(number: string, sellerOrderId: string, expectedVersion: number) { return apiFetch(`/orders/${encodeURIComponent(number)}/seller-orders/${sellerOrderId}/confirm`, { method: 'POST', body: JSON.stringify({ expectedVersion }) }); }
export async function openSellerOrderIssue(number: string, sellerOrderId: string, reason: string) { return apiFetch(`/orders/${encodeURIComponent(number)}/seller-orders/${sellerOrderId}/issues`, { method: 'POST', body: JSON.stringify({ reason }) }); }
