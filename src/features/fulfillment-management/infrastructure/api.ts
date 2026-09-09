import { adminFetch } from '@/shared/admin/client';
import { activeMutationEnvelopeSchema, fulfillmentEnvelopeSchema, pickupPointResultEnvelopeSchema, shippingZoneResultEnvelopeSchema, type PickupPointInput, type ShippingZoneInput } from '../domain/contracts';

export async function getFulfillmentConfiguration() { const response = await adminFetch('/admin/fulfillment', {}, fulfillmentEnvelopeSchema); return response.data; }
export async function saveShippingZone(id: string | undefined, input: ShippingZoneInput) { return adminFetch(id ? `/admin/fulfillment/shipping-zones/${id}` : '/admin/fulfillment/shipping-zones', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) }, shippingZoneResultEnvelopeSchema); }
export async function setShippingZoneActive(id: string, active: boolean) { return adminFetch(`/admin/fulfillment/shipping-zones/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }, activeMutationEnvelopeSchema); }
export async function savePickupPoint(id: string | undefined, input: PickupPointInput) { return adminFetch(id ? `/admin/fulfillment/pickup-points/${id}` : '/admin/fulfillment/pickup-points', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) }, pickupPointResultEnvelopeSchema); }
export async function setPickupPointActive(id: string, active: boolean) { return adminFetch(`/admin/fulfillment/pickup-points/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }, activeMutationEnvelopeSchema); }
