import { apiFetch } from '@/shared/api/client';
import {
  affiliateBalanceSchema,
  affiliateListingSchema,
  affiliateLogisticsSchema,
  affiliateOrderSchema,
  affiliateOrdersEnvelopeSchema,
  affiliatePayoutsEnvelopeSchema,
  affiliateProfileSchema,
  listingStatusSchema,
  tcgdexCardEnvelopeSchema,
  tcgdexSearchEnvelopeSchema,
  type AffiliateListingEditorValues,
} from '../domain/contracts';

function data<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) return (payload as { data: T }).data;
  return payload as T;
}

function minorFromDecimal(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) throw new Error('Ingresá un precio válido');
  const [integer, fraction = ''] = normalized.split('.');
  const priceMinor = (BigInt(integer || '0') * 100n + BigInt((fraction + '00').slice(0, 2))).toString();
  if (priceMinor === '0') throw new Error('Ingresá un precio mayor a cero');
  return priceMinor;
}

function emptyToUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function listingBody(values: AffiliateListingEditorValues, options?: { expectedVersion?: number }) {
  const pokemonCard = values.kind === 'SINGLE_CARD'
    ? {
        pokemonType: values.pokemonType,
        setName: values.setName!,
        setCode: emptyToUndefined(values.setCode),
        cardNumber: values.cardNumber!,
        rarity: values.rarity!,
        language: values.language!,
        condition: values.condition!,
        finish: emptyToUndefined(values.finish),
        edition: emptyToUndefined(values.edition),
        gradingCompany: emptyToUndefined(values.gradingCompany),
        grade: emptyToUndefined(values.grade),
        certificationNumber: emptyToUndefined(values.certificationNumber),
      }
    : options?.expectedVersion !== undefined ? null : undefined;
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    kind: values.kind,
    stockMode: values.stockMode,
    priceMinor: minorFromDecimal(values.price),
    stock: values.stock,
    ...(pokemonCard !== undefined ? { pokemonCard } : {}),
    ...(options?.expectedVersion !== undefined ? { expectedVersion: options.expectedVersion } : {}),
  };
}

export async function getAffiliateProfile() { return affiliateProfileSchema.parse(data(await apiFetch('/affiliate/profile'))); }
export async function updateAffiliateProfile(input: Record<string, unknown>) { return affiliateProfileSchema.parse(data(await apiFetch('/affiliate/profile', { method: 'PATCH', body: JSON.stringify(input) }))); }
export async function listAffiliateListings() { const response = await apiFetch('/affiliate/listings'); const rows = data<unknown[]>(response); return rows.map((row) => affiliateListingSchema.parse(row)); }
export async function createAffiliateListing(values: AffiliateListingEditorValues) {
  return data<{ id: string; productId: string }>(await apiFetch('/affiliate/listings', { method: 'POST', body: JSON.stringify(listingBody(values)) }));
}
export async function updateAffiliateListing(id: string, expectedVersion: number, values: AffiliateListingEditorValues) {
  const result = data<{ id: string; version: number; status: unknown }>(await apiFetch(`/affiliate/listings/${id}`, { method: 'PUT', body: JSON.stringify(listingBody(values, { expectedVersion })) }));
  return { id: result.id, version: result.version, status: listingStatusSchema.parse(result.status) };
}
export async function submitAffiliateListing(id: string) {
  const result = data<{ id: string; status: unknown }>(await apiFetch(`/affiliate/listings/${id}/submit`, { method: 'POST', body: JSON.stringify({}) }));
  return { id: result.id, status: listingStatusSchema.parse(result.status) };
}
export async function uploadAffiliateImages(id: string, expectedVersion: number, files: File[]) {
  const body = new FormData();
  body.set('expectedVersion', String(expectedVersion));
  files.forEach((file) => body.append('images', file));
  return data<{ fileIds: string[] }>(await apiFetch(`/affiliate/listings/${id}/images`, { method: 'POST', body }));
}
export async function updateAffiliateImage(listingId: string, imageId: string, expectedVersion: number, altText: string | null) {
  return data<{ id: string; version: number }>(await apiFetch(`/affiliate/listings/${listingId}/images/${imageId}`, { method: 'PATCH', body: JSON.stringify({ expectedVersion, altText }) }));
}
export async function reorderAffiliateImages(listingId: string, expectedVersion: number, imageIds: string[]) {
  return data<{ imageIds: string[]; version: number }>(await apiFetch(`/affiliate/listings/${listingId}/images/order`, { method: 'PUT', body: JSON.stringify({ expectedVersion, imageIds }) }));
}
export async function importAffiliateTcgdexImage(listingId: string, expectedVersion: number, imageUrl: string) {
  return data<{ fileIds: string[]; version: number }>(await apiFetch(`/affiliate/listings/${listingId}/tcgdex-image`, { method: 'POST', body: JSON.stringify({ expectedVersion, imageUrl }) }));
}
export async function searchAffiliateTcgdexCards(query: string) {
  const response = await apiFetch(`/affiliate/tcgdex/cards?q=${encodeURIComponent(query)}`, {}, tcgdexSearchEnvelopeSchema);
  return response.data;
}
export async function getAffiliateTcgdexCard(id: string) {
  const response = await apiFetch(`/affiliate/tcgdex/cards/${encodeURIComponent(id)}`, {}, tcgdexCardEnvelopeSchema);
  return response.data.card;
}
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
