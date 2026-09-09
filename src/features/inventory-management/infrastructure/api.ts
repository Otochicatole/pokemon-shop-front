import { adminFetch } from '@/shared/admin/client';
import { adjustmentListEnvelopeSchema, inventoryListEnvelopeSchema, inventoryMutationEnvelopeSchema, type InventoryAdjustment, type InventoryProduct } from '../domain/contracts';

export interface InventoryQuery { search?: string; stock?: string; cursor?: string; limit?: number }

export async function listInventory(query: InventoryQuery): Promise<{ data: InventoryProduct[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  const response = await adminFetch(`/admin/inventory?${params}`, {}, inventoryListEnvelopeSchema);
  return { data: response.data, nextCursor: response.meta.nextCursor };
}

export async function adjustInventory(productId: string, delta: number, reason: string) {
  return adminFetch(`/admin/products/${productId}/inventory-adjustment`, { method: 'POST', body: JSON.stringify({ delta, reason }) }, inventoryMutationEnvelopeSchema);
}

export async function getInventoryHistory(productId: string, cursor?: string): Promise<{ data: InventoryAdjustment[]; nextCursor: string | null }> {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const response = await adminFetch(`/admin/products/${productId}/inventory-adjustments?${params}`, {}, adjustmentListEnvelopeSchema);
  return { data: response.data, nextCursor: response.meta.nextCursor };
}
