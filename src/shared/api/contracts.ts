import { z } from 'zod';
import { BASE_CURRENCY } from '@/shared/lib/currency';

export const moneySchema = z.object({ amountMinor: z.string(), currency: z.literal(BASE_CURRENCY) });
export type Money = z.infer<typeof moneySchema>;

export const productKindSchema = z.enum(['SINGLE_CARD', 'SEALED_PRODUCT', 'ACCESSORY']);
export const pokemonTypeSchema = z.enum(['COLORLESS', 'DARKNESS', 'DRAGON', 'FAIRY', 'FIGHTING', 'FIRE', 'GRASS', 'LIGHTNING', 'METAL', 'PSYCHIC', 'WATER']);
export const productConditionSchema = z.enum(['NM', 'EXCELLENT', 'GOOD', 'PLAYED', 'DAMAGED']);
export type ProductKind = z.infer<typeof productKindSchema>;
export type PokemonType = z.infer<typeof pokemonTypeSchema>;
export type ProductCondition = z.infer<typeof productConditionSchema>;

export const pokemonCardSchema = z.object({
  setName: z.string(),
  setCode: z.string().nullable(),
  cardNumber: z.string(),
  rarity: z.string(),
  language: z.string(),
  condition: productConditionSchema,
  pokemonType: pokemonTypeSchema.nullish().transform((value) => value ?? null),
  finish: z.string().nullable(),
  edition: z.string().nullable(),
  gradingCompany: z.string().nullable(),
  grade: z.string().nullable(),
  certificationNumber: z.string().nullable(),
});

export const productSchema = z.object({
  id: z.string(), sku: z.string(), slug: z.string(), name: z.string(), description: z.string(),
  kind: productKindSchema, stockMode: z.enum(['UNIQUE', 'QUANTITY']),
  price: moneySchema, available: z.number().int().nonnegative(), productVersion: z.number().int(),
  pokemonCard: pokemonCardSchema.nullable().optional(),
  images: z.array(z.object({ id: z.string(), url: z.string(), altText: z.string().nullable(), sortOrder: z.number() })).default([]),
  updatedAt: z.string().or(z.date()).optional(),
});
export type Product = z.infer<typeof productSchema>;
export const productListSchema = z.object({ data: z.array(productSchema), meta: z.object({ nextCursor: z.string().nullable() }) });

export const catalogFacetOptionSchema = z.object({ value: z.string(), count: z.number().int().nonnegative() });
export const catalogFiltersSchema = z.object({
  totalProducts: z.number().int().nonnegative(),
  kinds: z.array(catalogFacetOptionSchema),
  pokemonTypes: z.array(catalogFacetOptionSchema),
  sets: z.array(catalogFacetOptionSchema),
  rarities: z.array(catalogFacetOptionSchema),
  conditions: z.array(catalogFacetOptionSchema),
  languages: z.array(catalogFacetOptionSchema),
  finishes: z.array(catalogFacetOptionSchema),
  editions: z.array(catalogFacetOptionSchema),
  gradingCompanies: z.array(catalogFacetOptionSchema),
  priceRange: z.object({ minMinor: z.string().nullable(), maxMinor: z.string().nullable() }),
});
export const catalogFiltersEnvelopeSchema = z.object({ data: catalogFiltersSchema, meta: z.record(z.string(), z.unknown()).optional() });
export type CatalogFacetOption = z.infer<typeof catalogFacetOptionSchema>;
export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;

export const optionsSchema = z.object({
  fulfillment: z.object({
    shippingZones: z.array(z.object({ id: z.string(), name: z.string(), provinces: z.array(z.string()), rates: z.array(z.object({ id: z.string(), name: z.string(), price: moneySchema })) })),
    pickupPoints: z.array(z.object({ id: z.string(), name: z.string(), address: z.string() })),
  }),
  paymentMethods: z.object({ BANK_TRANSFER: z.boolean(), MERCADO_PAGO: z.boolean() }),
});
export type CheckoutOptions = z.infer<typeof optionsSchema>;

export const userSchema = z.object({ id: z.string(), email: z.string().email(), name: z.string().nullable(), emailVerified: z.boolean() });
export type User = z.infer<typeof userSchema>;
export const loyaltyProgramSchema = z.object({
  enabled: z.boolean(),
  currency: z.literal(BASE_CURRENCY),
  spendPerPoint: moneySchema,
  pointsPerStep: z.number().int().positive(),
  pointValue: moneySchema,
  minimumRedemptionPoints: z.number().int().positive(),
  maximumRedemptionPercent: z.number().int().min(1).max(90),
  version: z.number().int().positive(),
  updatedAt: z.string().or(z.date()),
});
export const loyaltyAccountSchema = z.object({
  balance: z.number().int(),
  reserved: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
  lifetimeEarned: z.number().int().nonnegative(),
  lifetimeRedeemed: z.number().int().nonnegative(),
});
export const loyaltyTransactionSchema = z.object({
  id: z.string(),
  type: z.enum(['EARN', 'REDEEM', 'EARN_REVERSAL', 'REDEEM_REVERSAL', 'ADJUSTMENT']),
  points: z.number().int(),
  balanceAfter: z.number().int(),
  description: z.string().nullable(),
  orderNumber: z.string().nullable(),
  createdAt: z.string().or(z.date()),
});
export type LoyaltyProgram = z.infer<typeof loyaltyProgramSchema>;
export type LoyaltyAccount = z.infer<typeof loyaltyAccountSchema>;
export type LoyaltyTransaction = z.infer<typeof loyaltyTransactionSchema>;
export const orderInputSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1), productVersion: z.number().int().min(1) })).min(1),
  fulfillment: z.discriminatedUnion('type', [
    z.object({ type: z.literal('PICKUP'), pickupPointId: z.string() }),
    z.object({ type: z.literal('SHIPMENT'), shippingRateId: z.string(), recipientName: z.string().min(1), recipientPhone: z.string().min(6), addressLine1: z.string().min(1), addressLine2: z.string().optional(), city: z.string().min(1), province: z.string().min(1), postalCode: z.string().min(3) }),
  ]),
  paymentMethod: z.enum(['BANK_TRANSFER', 'MERCADO_PAGO']),
  pointsToRedeem: z.number().int().min(0).max(2_000_000_000),
});
export type OrderInput = z.infer<typeof orderInputSchema>;
export const checkoutPreviewSchema = z.object({
  subtotal: moneySchema,
  discount: moneySchema,
  shipping: moneySchema,
  total: moneySchema,
  loyalty: z.object({
    enabled: z.boolean(), balance: z.number().int(), reserved: z.number().int().nonnegative(), available: z.number().int().nonnegative(),
    pointsRedeemed: z.number().int().nonnegative(), maximumRedeemablePoints: z.number().int().nonnegative(),
    minimumRedemptionPoints: z.number().int().positive(), pointsToEarn: z.number().int().nonnegative(), pointValue: moneySchema,
  }),
  expiresAt: z.string().or(z.date()),
});
export type CheckoutPreview = z.infer<typeof checkoutPreviewSchema>;
export const orderLoyaltySchema = z.object({
  programVersion: z.number().int().nullable(),
  pointsRedeemed: z.number().int().nonnegative(),
  pointsDiscount: moneySchema,
  pointsEarned: z.number().int().nonnegative(),
  redemptionStatus: z.enum(['NONE', 'RESERVED', 'REDEEMED', 'RELEASED', 'RESTORED']),
  spendPerPoint: moneySchema.nullable(),
  pointValue: moneySchema.nullable(),
});
export const orderTimelineEventSchema = z.object({ id: z.string(), fromStatus: z.string().nullable(), toStatus: z.string(), createdAt: z.string().or(z.date()) });
export type OrderTimelineEvent = z.infer<typeof orderTimelineEventSchema>;
export const orderSchema = z.object({ id: z.string(), number: z.string(), status: z.string(), paymentMethod: z.string(), fulfillmentType: z.string(), totals: z.object({ subtotal: moneySchema, discount: moneySchema, shipping: moneySchema, total: moneySchema }), loyalty: orderLoyaltySchema, expiresAt: z.string().nullable().optional(), items: z.array(z.object({ productId: z.string(), sku: z.string(), name: z.string(), quantity: z.number(), unitPrice: moneySchema, lineTotal: moneySchema })), timeline: z.array(orderTimelineEventSchema).default([]), fulfillment: z.record(z.string(), z.unknown()).optional(), payment: z.record(z.string(), z.unknown()).nullable().optional(), createdAt: z.string().or(z.date()) });
export type Order = z.infer<typeof orderSchema>;
export const problemSchema = z.object({ code: z.string(), status: z.number(), title: z.string(), requestId: z.string().optional(), details: z.unknown().optional() });
export type Problem = z.infer<typeof problemSchema>;
