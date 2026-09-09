import { z } from 'zod';
import { moneySchema } from '@/shared/api/contracts';

export const shippingRateSchema = z.object({ id: z.string(), name: z.string(), price: moneySchema, active: z.boolean() });
export const shippingZoneSchema = z.object({ id: z.string(), name: z.string(), active: z.boolean(), provinces: z.array(z.string()), rates: z.array(shippingRateSchema), createdAt: z.string(), updatedAt: z.string() });
export const pickupPointSchema = z.object({ id: z.string(), name: z.string(), address: z.string(), active: z.boolean(), createdAt: z.string(), updatedAt: z.string() });
export const fulfillmentEnvelopeSchema = z.object({ data: z.object({ shippingZones: z.array(shippingZoneSchema), pickupPoints: z.array(pickupPointSchema) }), meta: z.record(z.string(), z.unknown()).optional() });
export const shippingZoneResultEnvelopeSchema = z.object({ data: z.object({ shippingZone: shippingZoneSchema }), meta: z.record(z.string(), z.unknown()).optional() });
export const pickupPointResultEnvelopeSchema = z.object({ data: z.object({ pickupPoint: pickupPointSchema }), meta: z.record(z.string(), z.unknown()).optional() });
export const activeMutationEnvelopeSchema = z.object({ data: z.object({ id: z.string(), active: z.boolean() }), meta: z.record(z.string(), z.unknown()).optional() });
export type ShippingZone = z.infer<typeof shippingZoneSchema>;
export type PickupPoint = z.infer<typeof pickupPointSchema>;
export interface ShippingZoneInput { name: string; active: boolean; provinces: string[]; rates: Array<{ id?: string; name: string; priceMinor: string; active: boolean }> }
export interface PickupPointInput { name: string; address: string; active: boolean }
