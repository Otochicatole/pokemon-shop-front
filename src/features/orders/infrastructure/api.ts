import { apiFetch } from '@/shared/api/client';
import { orderSchema, type Order } from '@/shared/api/contracts';
export async function listOrders(cursor?: string) { const data = await apiFetch(`/orders?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`) as { data: unknown[]; nextCursor: string | null }; return { data: data.data.map((entry) => orderSchema.parse(entry)), nextCursor: data.nextCursor }; }
export async function getOrder(number: string): Promise<Order> { const data = await apiFetch(`/orders/${encodeURIComponent(number)}`) as { order: unknown }; return orderSchema.parse(data.order); }
export async function cancelOrder(number: string) { return apiFetch(`/orders/${encodeURIComponent(number)}/cancel`, { method: 'POST' }); }
