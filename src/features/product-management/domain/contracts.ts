import { z } from 'zod';
import { moneySchema, pokemonCardSchema, pokemonTypeSchema, productConditionSchema, productKindSchema } from '@/shared/api/contracts';

export const adminProductStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const adminProductImageSchema = z.object({ id: z.string(), fileId: z.string().optional(), url: z.string(), altText: z.string().nullable(), sortOrder: z.number().int(), removedAt: z.string().nullable().optional() });
export const adminInventorySchema = z.object({ onHand: z.number().int().nonnegative(), reserved: z.number().int().nonnegative(), available: z.number().int(), version: z.number().int() });
export const adminProductSchema = z.object({
  id: z.string(), sku: z.string(), slug: z.string(), name: z.string(), description: z.string(),
  kind: productKindSchema, stockMode: z.enum(['UNIQUE', 'QUANTITY']), status: adminProductStatusSchema,
  price: moneySchema, version: z.number().int(), inventory: adminInventorySchema.nullable().transform((value) => value ?? { onHand: 0, reserved: 0, available: 0, version: 0 }),
  pokemonCard: pokemonCardSchema.nullable().optional(), images: z.array(adminProductImageSchema).default([]),
  publishedAt: z.string().nullable().optional(), archivedAt: z.string().nullable().optional(), createdAt: z.string().or(z.date()), updatedAt: z.string().or(z.date()),
});
export type AdminProduct = z.infer<typeof adminProductSchema>;
export type AdminProductImage = z.infer<typeof adminProductImageSchema>;

export const adminProductListEnvelopeSchema = z.object({ data: z.array(adminProductSchema), meta: z.object({ nextCursor: z.string().nullable() }) });
export const adminProductDetailEnvelopeSchema = z.object({ data: z.object({ product: adminProductSchema }), meta: z.record(z.string(), z.unknown()).optional() });
export const productMutationEnvelopeSchema = adminProductDetailEnvelopeSchema;
export const productStatusEnvelopeSchema = z.object({ data: z.object({ id: z.string(), status: z.enum(['PUBLISHED', 'ARCHIVED']), version: z.number().int() }), meta: z.record(z.string(), z.unknown()).optional() });
export const productImagesEnvelopeSchema = z.object({ data: z.object({ version: z.number().int(), images: z.array(adminProductImageSchema) }), meta: z.record(z.string(), z.unknown()).optional() });
export const productImageUpdateEnvelopeSchema = z.object({ data: z.object({ id: z.string(), altText: z.string().nullable(), version: z.number().int() }), meta: z.record(z.string(), z.unknown()).optional() });
export const productImageOrderEnvelopeSchema = z.object({ data: z.object({ imageIds: z.array(z.string()), version: z.number().int() }), meta: z.record(z.string(), z.unknown()).optional() });
export const inventoryMutationEnvelopeSchema = z.object({ data: z.object({ productId: z.string(), onHand: z.number().int(), reserved: z.number().int(), available: z.number().int(), version: z.number().int() }), meta: z.record(z.string(), z.unknown()).optional() });

export const productEditorSchema = z.object({
  sku: z.string().trim().min(1, 'El SKU es obligatorio').max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Usá minúsculas, números y guiones').max(120),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(180),
  description: z.string().max(5000),
  kind: productKindSchema,
  stockMode: z.enum(['UNIQUE', 'QUANTITY']),
  price: z.string().regex(/^\d+(?:[.,]\d{1,2})?$/, 'Ingresá un precio válido'),
  initialStock: z.number().int().min(0).max(1_000_000),
  pokemonType: pokemonTypeSchema.optional(),
  setName: z.string().max(120).optional(), setCode: z.string().max(40).optional(), cardNumber: z.string().max(30).optional(), rarity: z.string().max(80).optional(), language: z.string().max(40).optional(), condition: productConditionSchema.optional(), finish: z.string().max(50).optional(), edition: z.string().max(80).optional(), gradingCompany: z.string().max(80).optional(), grade: z.string().max(30).optional(), certificationNumber: z.string().max(100).optional(),
}).superRefine((value, context) => {
  if (value.kind === 'SINGLE_CARD') {
    for (const key of ['setName', 'cardNumber', 'rarity', 'language', 'condition'] as const) if (!value[key]) context.addIssue({ code: 'custom', path: [key], message: 'Campo obligatorio para cartas' });
  }
  if (value.stockMode === 'UNIQUE' && value.initialStock > 1) context.addIssue({ code: 'custom', path: ['initialStock'], message: 'Una pieza única admite como máximo una unidad' });
});
export type ProductEditorValues = z.infer<typeof productEditorSchema>;

export const inventoryAdjustmentSchema = z.object({ id: z.string(), delta: z.number().int(), reason: z.string(), createdAt: z.string().or(z.date()), createdBy: z.object({ id: z.string(), name: z.string().nullable(), email: z.string() }).nullable().optional() });
export type InventoryAdjustment = z.infer<typeof inventoryAdjustmentSchema>;
export const inventoryHistoryEnvelopeSchema = z.object({ data: z.array(inventoryAdjustmentSchema), meta: z.object({ nextCursor: z.string().nullable() }) });
