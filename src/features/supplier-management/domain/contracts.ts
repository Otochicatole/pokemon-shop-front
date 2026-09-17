import { z } from 'zod';
import { pokemonTypeSchema, productConditionSchema, productKindSchema } from '@/shared/api/contracts';

const dateTime = z.string().datetime();
const moneySchema = z.object({ amountMinor: z.string().regex(/^\d+$/), currency: z.literal('USD') });

export const supplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  contactName: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
  version: z.number().int(),
  createdAt: dateTime,
  updatedAt: dateTime,
});

export const supplierListEnvelopeSchema = z.object({
  data: z.array(supplierSchema),
  meta: z.object({ nextCursor: z.string().nullable().optional() }),
});

export const supplierDetailEnvelopeSchema = z.object({
  data: z.object({ supplier: supplierSchema }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const supplierActiveEnvelopeSchema = z.object({
  data: z.object({ id: z.string().uuid(), active: z.boolean(), version: z.number().int() }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const supplierPurchaseItemProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  kind: z.string(),
  stockMode: z.string(),
  status: z.string(),
  price: moneySchema,
  imageUrl: z.string().nullable(),
  pokemonCard: z.object({
    pokemonType: z.string().nullable(),
    setName: z.string(),
    setCode: z.string().nullable(),
    cardNumber: z.string(),
    rarity: z.string(),
    language: z.string(),
    condition: z.string(),
    finish: z.string().nullable(),
    edition: z.string().nullable(),
    gradingCompany: z.string().nullable(),
    grade: z.string().nullable(),
    certificationNumber: z.string().nullable(),
  }).nullable(),
}).nullable().optional();

export const supplierPurchaseItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  productSku: z.string(),
  productName: z.string(),
  quantity: z.number().int(),
  unitCost: moneySchema,
  lineTotal: moneySchema,
  product: supplierPurchaseItemProductSchema,
});

export const supplierPurchaseSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  purchasedAt: dateTime,
  note: z.string().nullable(),
  itemCount: z.number().int(),
  totalCost: moneySchema,
  createdAt: dateTime,
  updatedAt: dateTime,
  createdBy: z.object({ id: z.string().uuid(), name: z.string().nullable(), email: z.string().email() }).nullable().optional(),
  items: z.array(supplierPurchaseItemSchema),
});

export const supplierPurchaseListEnvelopeSchema = z.object({
  data: z.array(supplierPurchaseSchema),
  meta: z.object({ nextCursor: z.string().nullable().optional() }),
});

export const supplierPurchaseDetailEnvelopeSchema = z.object({
  data: z.object({ purchase: supplierPurchaseSchema }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(180),
  contactName: z.string().trim().max(120).optional(),
  email: z.union([z.literal(''), z.string().trim().email('Ingresá un email válido').max(254)]).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const purchaseProductFieldsSchema = z.object({
  sku: z.string().trim().min(1, 'El SKU es obligatorio').max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Usá minúsculas, números y guiones').max(120),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(180),
  description: z.string().max(5000),
  kind: productKindSchema,
  stockMode: z.enum(['UNIQUE', 'QUANTITY']),
  price: z.string().regex(/^\d+(?:[.,]\d{1,2})?$/, 'Ingresá un precio válido'),
  pokemonType: pokemonTypeSchema.optional(),
  setName: z.string().max(120).optional(),
  setCode: z.string().max(40).optional(),
  cardNumber: z.string().max(30).optional(),
  rarity: z.string().max(80).optional(),
  language: z.string().max(40).optional(),
  condition: productConditionSchema.optional(),
  finish: z.string().max(50).optional(),
  edition: z.string().max(80).optional(),
  gradingCompany: z.string().max(80).optional(),
  grade: z.string().max(30).optional(),
  certificationNumber: z.string().max(100).optional(),
}).superRefine((value, context) => {
  if (value.kind === 'SINGLE_CARD') {
    for (const key of ['setName', 'cardNumber', 'rarity', 'language', 'condition'] as const) {
      if (!value[key]) context.addIssue({ code: 'custom', path: [key], message: 'Campo obligatorio para cartas' });
    }
  }
});

export const purchaseLineFormSchema = purchaseProductFieldsSchema.extend({
  productId: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.string().uuid().optional(),
  ),
  quantity: z.number().int().min(1, 'Mínimo 1').max(1_000_000),
  unitCost: z.string().trim().regex(/^\d+([.,]\d{1,2})?$/, 'Ingresá un costo válido'),
}).superRefine((value, context) => {
  if (value.productId) return;
  if (value.stockMode === 'UNIQUE' && value.quantity > 1) {
    context.addIssue({ code: 'custom', path: ['quantity'], message: 'Una pieza única admite como máximo una unidad' });
  }
});

export const purchaseFormSchema = z.object({
  purchasedAt: z.string().min(1, 'La fecha es obligatoria'),
  note: z.string().trim().max(2000).optional(),
  items: z.array(purchaseLineFormSchema).min(1, 'Agregá al menos un producto'),
});

export type Supplier = z.infer<typeof supplierSchema>;
export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
export type SupplierPurchase = z.infer<typeof supplierPurchaseSchema>;
export type SupplierPurchaseItem = z.infer<typeof supplierPurchaseItemSchema>;
export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;
export type PurchaseLineFormValues = z.infer<typeof purchaseLineFormSchema>;
