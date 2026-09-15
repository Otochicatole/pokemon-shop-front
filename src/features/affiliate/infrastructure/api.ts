import { apiFetch } from '@/shared/api/client';
import { affiliateBalanceSchema, affiliateListingSchema, affiliateLogisticsSchema, affiliateOrderSchema, affiliateOrdersEnvelopeSchema, affiliatePayoutsEnvelopeSchema, affiliateProfileSchema, listingStatusSchema } from '../domain/contracts';

function data<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) return (payload as { data: T }).data;
  return payload as T;
}

export async function getAffiliateProfile() { return affiliateProfileSchema.parse(data(await apiFetch('/affiliate/profile'))); }
export async function updateAffiliateProfile(input: Record<string, unknown>) { return affiliateProfileSchema.parse(data(await apiFetch('/affiliate/profile', { method: 'PATCH', body: JSON.stringify(input) }))); }
export async function listAffiliateListings() { const response = await apiFetch('/affiliate/listings'); const rows = data<unknown[]>(response); return rows.map((row) => affiliateListingSchema.parse(row)); }
export async function createAffiliateListing(input: Record<string, unknown>) { return data<{ id: string; productId: string }>(await apiFetch('/affiliate/listings', { method: 'POST', body: JSON.stringify(input) })); }
export async function updateAffiliateListing(id: string, input: Record<string, unknown>) {
  const result = data<{ id: string; version: number; status: unknown }>(await apiFetch(`/affiliate/listings/${id}`, { method: 'PUT', body: JSON.stringify(input) }));
  return { id: result.id, version: result.version, status: listingStatusSchema.parse(result.status) };
}
export async function submitAffiliateListing(id: string) {
  const result = data<{ id: string; status: unknown }>(await apiFetch(`/affiliate/listings/${id}/submit`, { method: 'POST', body: JSON.stringify({}) }));
  return { id: result.id, status: listingStatusSchema.parse(result.status) };
}
export async function uploadAffiliateImages(id: string, expectedVersion: number, files: File[]) { const body = new FormData(); body.set('expectedVersion', String(expectedVersion)); files.forEach((file) => body.append('images', file)); return data<{ fileIds: string[] }>(await apiFetch(`/affiliate/listings/${id}/images`, { method: 'POST', body })); }
export async function getAffiliateLogistics() { return affiliateLogisticsSchema.parse(data(await apiFetch('/affiliate/logistics'))); }
export async function createAffiliateShippingZone(input: { name: string; provinces: string[] }) { return data(await apiFetch('/affiliate/shipping-zones', { method: 'POST', body: JSON.stringify(input) })); }
export async function createAffiliateShippingRate(zoneId: string, input: { name: string; priceMinor: string }) { return data(await apiFetch(`/affiliate/shipping-zones/${zoneId}/rates`, { method: 'POST', body: JSON.stringify(input) })); }
export async function createAffiliatePickupPoint(input: { name: string; address: string }) { return data(await apiFetch('/affiliate/pickup-points', { method: 'POST', body: JSON.stringify(input) })); }
export async function listAffiliateOrders() {
  const payload = data<unknown>(await apiFetch('/affiliate/orders'));
  const parsed = affiliateOrdersEnvelopeSchema.safeParse(payload);
  if (parsed.success) return parsed.data.items;
  if (Array.isArray(payload)) return payload.map((row) => affiliateOrderSchema.parse(row));
  throw new Error('La respuesta de ventas del afiliado no tiene un formato válido');
}
export async function getAffiliateOrder(id: string) { const payload = data<{ order: unknown }>(await apiFetch(`/affiliate/orders/${id}`)); return affiliateOrderSchema.parse(payload.order); }
export async function getAffiliateBalance() { return affiliateBalanceSchema.parse(data(await apiFetch('/affiliate/balance'))); }
export async function requestAffiliatePayout(amountMinor: string) { return data(await apiFetch('/affiliate/payouts', { method: 'POST', body: JSON.stringify({ amountMinor }) })); }
export async function listAffiliatePayouts(page = 1, pageSize = 20) { return affiliatePayoutsEnvelopeSchema.parse(data(await apiFetch(`/affiliate/payouts?page=${page}&pageSize=${pageSize}`))); }
export async function updateAffiliateOrderStatus(id: string, input: { expectedVersion: number; status: string; note?: string; carrier?: string | null; trackingCode?: string | null }) { return data(await apiFetch(`/affiliate/orders/${id}/status`, { method: 'POST', body: JSON.stringify(input) })); }
export async function requestAffiliateOrderCancellation(id: string, input: { expectedVersion: number; note: string }) { return data(await apiFetch(`/affiliate/orders/${id}/cancellation-request`, { method: 'POST', body: JSON.stringify(input) })); }
export async function updateAffiliateShippingZone(id: string, input: Record<string, unknown>) { return data(await apiFetch(`/affiliate/shipping-zones/${id}`, { method: 'PATCH', body: JSON.stringify(input) })); }
export async function updateAffiliateShippingRate(zoneId: string, rateId: string, input: Record<string, unknown>) { return data(await apiFetch(`/affiliate/shipping-zones/${zoneId}/rates/${rateId}`, { method: 'PATCH', body: JSON.stringify(input) })); }
export async function updateAffiliatePickupPoint(id: string, input: Record<string, unknown>) { return data(await apiFetch(`/affiliate/pickup-points/${id}`, { method: 'PATCH', body: JSON.stringify(input) })); }

export async function deleteAffiliateListing(id: string, expectedVersion: number) { await apiFetch(`/affiliate/listings/${id}`, { method: 'DELETE', body: JSON.stringify({ expectedVersion }) }); }
export async function archiveAffiliateListing(id: string, expectedVersion: number) { return data(await apiFetch(`/affiliate/listings/${id}/archive`, { method: 'POST', body: JSON.stringify({ expectedVersion }) })); }
export async function deleteAffiliateImage(listingId: string, imageId: string, expectedVersion: number) { await apiFetch(`/affiliate/listings/${listingId}/images/${imageId}`, { method: 'DELETE', body: JSON.stringify({ expectedVersion }) }); }

export async function listAdminAffiliates() { const rows = data<unknown[]>(await import('@/shared/admin/client').then(({ adminFetch }) => adminFetch('/admin/affiliates'))); return rows; }
export async function listAdminAffiliateListings(status = 'PENDING_REVIEW') { const { adminFetch } = await import('@/shared/admin/client'); return data<unknown[]>(await adminFetch(`/admin/affiliates/listings?status=${status}`)); }
export async function reviewAdminAffiliateListing(id: string, input: Record<string, unknown>) { const { adminFetch } = await import('@/shared/admin/client'); return data(await adminFetch(`/admin/affiliates/listings/${id}/review`, { method: 'POST', body: JSON.stringify(input) })); }
