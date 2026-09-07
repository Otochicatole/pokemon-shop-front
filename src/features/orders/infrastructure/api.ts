import { apiFetch } from '@/shared/api/client';
import { orderSchema, type Order } from '@/shared/api/contracts';
export async function listOrders(cursor?: string) { const response = await apiFetch(`/orders?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`) as { data: unknown[]; meta: { nextCursor: string | null } }; return { data: response.data.map((entry) => orderSchema.parse(entry)), nextCursor: response.meta.nextCursor }; }
export async function getOrder(number: string): Promise<Order> { const response = await apiFetch(`/orders/${encodeURIComponent(number)}`) as { data: { order: unknown } }; return orderSchema.parse(response.data.order); }
export async function cancelOrder(number: string) { return apiFetch(`/orders/${encodeURIComponent(number)}/cancel`, { method: 'POST' }); }
