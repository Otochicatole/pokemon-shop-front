import { z } from 'zod';

export const moneySchema = z.object({ amountMinor: z.string(), currency: z.literal('ARS') });
export type Money = z.infer<typeof moneySchema>;

export const productSchema = z.object({
  id: z.string(), sku: z.string(), slug: z.string(), name: z.string(), description: z.string(),
  kind: z.enum(['SINGLE_CARD', 'SEALED_PRODUCT']), stockMode: z.enum(['UNIQUE', 'QUANTITY']),
  price: moneySchema, available: z.number().int().nonnegative(), productVersion: z.number().int(),
  pokemonCard: z.object({ setName: z.string(), setCode: z.string().nullable(), cardNumber: z.string(), rarity: z.string(), language: z.string(), condition: z.string(), finish: z.string().nullable(), edition: z.string().nullable(), gradingCompany: z.string().nullable(), grade: z.string().nullable() }).nullable().optional(),
  images: z.array(z.object({ id: z.string(), url: z.string(), altText: z.string().nullable(), sortOrder: z.number() })).default([]),
  updatedAt: z.string().or(z.date()).optional(),
});
export type Product = z.infer<typeof productSchema>;
export const productListSchema = z.object({ data: z.array(productSchema), meta: z.object({ nextCursor: z.string().nullable() }) });

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
export const orderInputSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1), productVersion: z.number().int().min(1) })).min(1),
  fulfillment: z.discriminatedUnion('type', [
    z.object({ type: z.literal('PICKUP'), pickupPointId: z.string() }),
    z.object({ type: z.literal('SHIPMENT'), shippingRateId: z.string(), recipientName: z.string().min(1), recipientPhone: z.string().min(6), addressLine1: z.string().min(1), addressLine2: z.string().optional(), city: z.string().min(1), province: z.string().min(1), postalCode: z.string().min(3) }),
  ]),
  paymentMethod: z.enum(['BANK_TRANSFER', 'MERCADO_PAGO']),
});
export type OrderInput = z.infer<typeof orderInputSchema>;
export const orderSchema = z.object({ id: z.string(), number: z.string(), status: z.string(), paymentMethod: z.string(), fulfillmentType: z.string(), totals: z.object({ subtotal: moneySchema, shipping: moneySchema, total: moneySchema }), expiresAt: z.string().nullable().optional(), items: z.array(z.object({ productId: z.string(), sku: z.string(), name: z.string(), quantity: z.number(), unitPrice: moneySchema, lineTotal: moneySchema })), fulfillment: z.record(z.string(), z.unknown()).optional(), payment: z.record(z.string(), z.unknown()).nullable().optional(), createdAt: z.string().or(z.date()) });
export type Order = z.infer<typeof orderSchema>;
export const problemSchema = z.object({ code: z.string(), status: z.number(), title: z.string(), requestId: z.string().optional(), details: z.unknown().optional() });
export type Problem = z.infer<typeof problemSchema>;
