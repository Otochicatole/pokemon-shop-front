import { z } from 'zod';
import { moneySchema, productKindSchema } from '@/shared/api/contracts';

export const inventoryProductSchema = z.object({
  id: z.string(), sku: z.string(), name: z.string(), kind: productKindSchema,
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']), stockMode: z.enum(['UNIQUE', 'QUANTITY']),
  price: moneySchema, version: z.number().int(),
  inventory: z.object({ onHand: z.number().int(), reserved: z.number().int(), available: z.number().int(), version: z.number().int() }).nullable().transform((value) => value ?? { onHand: 0, reserved: 0, available: 0, version: 0 }),
  images: z.array(z.object({ url: z.string(), altText: z.string().nullable().optional() })).default([]),
});
export type InventoryProduct = z.infer<typeof inventoryProductSchema>;
export const inventoryListEnvelopeSchema = z.object({ data: z.array(inventoryProductSchema), meta: z.object({ nextCursor: z.string().nullable() }) });
export const adjustmentSchema = z.object({
  id: z.string(), delta: z.number().int(), reason: z.string(), createdAt: z.string(),
  createdBy: z.object({ id: z.string(), email: z.string(), name: z.string().nullable() }).nullable().optional(),
});
export type InventoryAdjustment = z.infer<typeof adjustmentSchema>;
export const adjustmentListEnvelopeSchema = z.object({ data: z.array(adjustmentSchema), meta: z.object({ nextCursor: z.string().nullable() }) });
export const inventoryMutationEnvelopeSchema = z.object({ data: z.object({ productId: z.string(), onHand: z.number().int(), reserved: z.number().int(), available: z.number().int(), version: z.number().int() }), meta: z.record(z.string(), z.unknown()).optional() });
