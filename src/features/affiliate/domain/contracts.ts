import { z } from 'zod';

export const affiliateStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export const listingStatusSchema = z.enum(['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED']);
export const affiliateProductSchema = z.object({
  id: z.string(), sku: z.string(), slug: z.string(), name: z.string(), description: z.string(), kind: z.string(), stockMode: z.string(),
  priceMinor: z.string(), status: z.string(), version: z.number(),
  inventory: z.object({ onHand: z.number(), reserved: z.number(), available: z.number(), version: z.number() }).nullable(),
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
export const sellerOrderItemSchema = z.object({ id: z.string().optional(), productId: z.string(), productName: z.string().optional(), name: z.string().optional(), quantity: z.number(), unitPriceMinor: z.string().optional(), lineTotalMinor: z.string() }).passthrough();
export const sellerOrderHistorySchema = z.object({ id: z.string(), fromStatus: sellerOrderStatusSchema.nullable(), toStatus: sellerOrderStatusSchema, note: z.string().nullable(), createdAt: z.string(), changedByType: z.string().nullable().optional() }).passthrough();
export const affiliateIssueSchema = z.object({ id: z.string(), status: z.string(), reason: z.string(), createdAt: z.string(), resolvedAt: z.string().nullable().optional() }).passthrough();
export const affiliateOrderSchema = z.object({ id: z.string(), number: z.string(), sellerName: z.string(), status: sellerOrderStatusSchema, sellerType: z.enum(['STORE', 'AFFILIATE']).optional(), fulfillmentType: z.enum(['SHIPMENT', 'PICKUP']).optional(), subtotalMinor: z.string(), shippingMinor: z.string(), commissionMinor: z.string(), sellerNetMinor: z.string(), version: z.number(), carrier: z.string().nullable().optional(), trackingCode: z.string().nullable().optional(), autoCompleteAt: z.string().nullable().optional(), items: z.array(sellerOrderItemSchema), statusHistory: z.array(sellerOrderHistorySchema), issues: z.array(affiliateIssueSchema), allowedActions: z.array(z.string()).default([]) }).passthrough();
export const affiliateOrdersEnvelopeSchema = z.object({ items: z.array(affiliateOrderSchema), page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() });
export const affiliateShippingRateSchema = z.object({ id: z.string(), name: z.string(), priceMinor: z.string(), active: z.boolean() }).passthrough();
export const affiliateShippingZoneSchema = z.object({ id: z.string(), name: z.string(), active: z.boolean(), provinces: z.array(z.object({ id: z.string(), province: z.string() }).passthrough()), rates: z.array(affiliateShippingRateSchema) }).passthrough();
export const affiliatePickupPointSchema = z.object({ id: z.string(), name: z.string(), address: z.string(), active: z.boolean() }).passthrough();
export const affiliateLogisticsSchema = z.object({ zones: z.array(affiliateShippingZoneSchema), pickupPoints: z.array(affiliatePickupPointSchema) });
export type AffiliateProfile = z.infer<typeof affiliateProfileSchema>;
export type AffiliateListing = z.infer<typeof affiliateListingSchema>;
export type AffiliateBalance = z.infer<typeof affiliateBalanceSchema>;
export type AffiliateOrder = z.infer<typeof affiliateOrderSchema>;
export type AffiliateLogistics = z.infer<typeof affiliateLogisticsSchema>;
