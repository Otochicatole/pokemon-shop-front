import { z } from 'zod';
import { pokemonCardSchema, pokemonTypeSchema, productConditionSchema, productKindSchema } from '@/shared/api/contracts';

export const affiliateStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export const listingStatusSchema = z.enum(['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED']);
export const affiliateProductSchema = z.object({
  id: z.string(), sku: z.string(), slug: z.string(), name: z.string(), description: z.string(), kind: productKindSchema, stockMode: z.enum(['UNIQUE', 'QUANTITY']),
  priceMinor: z.string(), status: z.string(), version: z.number(),
  inventory: z.object({ onHand: z.number(), reserved: z.number(), available: z.number(), version: z.number() }).nullable(),
  pokemonCard: pokemonCardSchema.nullable().optional(),
  images: z.array(z.object({ id: z.string(), fileId: z.string(), url: z.string(), altText: z.string().nullable(), sortOrder: z.number() })),
  listing: z.object({ id: z.string(), status: listingStatusSchema, reviewNote: z.string().nullable(), submittedAt: z.string().nullable(), reviewedAt: z.string().nullable() }).nullable(),
  createdAt: z.string(), updatedAt: z.string(),
}).passthrough();
export const affiliateListingSchema = z.object({ id: z.string(), status: listingStatusSchema, reviewNote: z.string().nullable(), submittedAt: z.string().nullable(), reviewedAt: z.string().nullable(), product: affiliateProductSchema, createdAt: z.string(), updatedAt: z.string() });
export const affiliateProfileSchema = z.object({ id: z.string(), userId: z.string(), publicName: z.string(), contactPhone: z.string().nullable(), payoutAccountLast4: z.string().nullable(), status: affiliateStatusSchema, version: z.number(), createdAt: z.string(), updatedAt: z.string() }).passthrough();
export const affiliatePayoutSchema = z.object({ id: z.string(), amountMinor: z.string(), status: z.enum(['REQUESTED', 'PROCESSING', 'PAID', 'REJECTED']), destinationLast4: z.string().nullable().optional(), createdAt: z.string(), processedAt: z.string().nullable().optional() }).passthrough();
export const affiliatePayoutsEnvelopeSchema = z.object({ items: z.array(affiliatePayoutSchema), page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() });
export const affiliateBalanceSchema = z.object({ pendingMinor: z.string(), availableMinor: z.string(), reservedMinor: z.string(), paidMinor: z.string(), debtMinor: z.string().default('0'), entries: z.array(z.object({ id: z.string(), bucket: z.string(), type: z.string(), amountMinor: z.string(), createdAt: z.string() }).passthrough()), payouts: z.array(affiliatePayoutSchema).default([]), page: z.number().optional(), pageSize: z.number().optional(), total: z.number().optional(), totalPages: z.number().optional() });
export const sellerOrderStatusSchema = z.enum(['PENDING_PAYMENT', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'SHIPPED', 'COMPLETED', 'CANCELLATION_REQUESTED', 'CANCELLED', 'DISPUTED', 'REFUNDED']);
export const sellerOrderItemSchema = z.object({ id: z.string().optional(), productId: z.string().nullable(), productName: z.string().optional(), name: z.string().optional(), quantity: z.number(), unitPriceMinor: z.string().optional(), lineTotalMinor: z.string() }).passthrough();
export const sellerOrderHistorySchema = z.object({ id: z.string(), fromStatus: sellerOrderStatusSchema.nullable(), toStatus: sellerOrderStatusSchema, note: z.string().nullable(), createdAt: z.string(), changedByType: z.string().nullable().optional() }).passthrough();
export const affiliateIssueSchema = z.object({ id: z.string(), status: z.string(), reason: z.string(), createdAt: z.string(), resolvedAt: z.string().nullable().optional() }).passthrough();
export const affiliateOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  sellerName: z.string(),
  status: sellerOrderStatusSchema,
  sellerType: z.enum(['STORE', 'AFFILIATE']).optional(),
  fulfillmentType: z.enum(['SHIPMENT', 'PICKUP']).optional(),
  subtotalMinor: z.string(),
  shippingMinor: z.string(),
  commissionMinor: z.string(),
  sellerNetMinor: z.string(),
  version: z.number(),
  carrier: z.string().nullable().optional(),
  trackingCode: z.string().nullable().optional(),
  autoCompleteAt: z.string().nullable().optional(),
  recipientName: z.string().nullable().optional(),
  recipientPhone: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  shippingZoneName: z.string().nullable().optional(),
  shippingRateName: z.string().nullable().optional(),
  pickupPointName: z.string().nullable().optional(),
  pickupPointAddress: z.string().nullable().optional(),
  items: z.array(sellerOrderItemSchema),
  statusHistory: z.array(sellerOrderHistorySchema),
  issues: z.array(affiliateIssueSchema),
  allowedActions: z.array(z.string()).default([]),
}).passthrough();
export const affiliateOrdersEnvelopeSchema = z.object({ items: z.array(affiliateOrderSchema), page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() });
export const affiliateShippingRateSchema = z.object({ id: z.string(), name: z.string(), priceMinor: z.string(), active: z.boolean() }).passthrough();
export const affiliateShippingZoneSchema = z.object({ id: z.string(), name: z.string(), active: z.boolean(), provinces: z.array(z.object({ id: z.string(), province: z.string() }).passthrough()), rates: z.array(affiliateShippingRateSchema) }).passthrough();
export const affiliatePickupPointSchema = z.object({ id: z.string(), name: z.string(), address: z.string(), active: z.boolean() }).passthrough();
export const affiliateLogisticsSchema = z.object({ zones: z.array(affiliateShippingZoneSchema), pickupPoints: z.array(affiliatePickupPointSchema) });

export const affiliateListingEditorSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(180),
  description: z.string().max(5000),
  kind: productKindSchema,
  stockMode: z.enum(['UNIQUE', 'QUANTITY']),
  price: z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/, 'Ingresá un precio válido'),
  stock: z.number().int().min(0).max(1_000_000),
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
  const normalized = value.price.replace(',', '.');
  const [integer, fraction = ''] = normalized.split('.');
  const priceMinor = BigInt(integer || '0') * 100n + BigInt((fraction + '00').slice(0, 2));
  if (priceMinor <= 0n) {
    context.addIssue({ code: 'custom', path: ['price'], message: 'Ingresá un precio mayor a cero' });
  }
  if (value.kind === 'SINGLE_CARD') {
    for (const key of ['setName', 'cardNumber', 'rarity', 'language', 'condition'] as const) {
      if (!value[key]) context.addIssue({ code: 'custom', path: [key], message: 'Campo obligatorio para cartas' });
    }
  }
  if (value.stockMode === 'UNIQUE' && value.stock > 1) {
    context.addIssue({ code: 'custom', path: ['stock'], message: 'Una pieza única admite como máximo una unidad' });
  }
});

export const tcgdexCardSummarySchema = z.object({
  id: z.string(), name: z.string(), localId: z.string(), setCode: z.string(), imageUrl: z.string().url().nullable(),
  setName: z.string().optional(), rarity: z.string().optional(), category: z.string().optional(), types: z.array(z.string()).optional(),
  firstEdition: z.boolean().optional(), holo: z.boolean().optional(),
});
export const tcgdexCardSchema = tcgdexCardSummarySchema.extend({
  setName: z.string(), description: z.string(), rarity: z.string(), category: z.string(), types: z.array(z.string()),
  firstEdition: z.boolean(), holo: z.boolean(), effect: z.string(), language: z.string(),
});
export const tcgdexSearchEnvelopeSchema = z.object({ data: z.array(tcgdexCardSummarySchema), meta: z.record(z.string(), z.unknown()).optional() });
export const tcgdexCardEnvelopeSchema = z.object({ data: z.object({ card: tcgdexCardSchema }), meta: z.record(z.string(), z.unknown()).optional() });
export const tcgdexRaritiesEnvelopeSchema = z.object({ data: z.array(z.string()), meta: z.record(z.string(), z.unknown()).optional() });
export const tcgdexSetOptionSchema = z.object({ id: z.string(), name: z.string() });
export const tcgdexSetsEnvelopeSchema = z.object({ data: z.array(tcgdexSetOptionSchema), meta: z.record(z.string(), z.unknown()).optional() });

export type AffiliateProfile = z.infer<typeof affiliateProfileSchema>;
export type AffiliateListing = z.infer<typeof affiliateListingSchema>;
export type AffiliateBalance = z.infer<typeof affiliateBalanceSchema>;
export type AffiliateOrder = z.infer<typeof affiliateOrderSchema>;
export type AffiliateLogistics = z.infer<typeof affiliateLogisticsSchema>;
export type AffiliateListingEditorValues = z.infer<typeof affiliateListingEditorSchema>;
export type TcgDexCardSummary = z.infer<typeof tcgdexCardSummarySchema>;
export type TcgDexCard = z.infer<typeof tcgdexCardSchema>;
