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
export const affiliateBalanceSchema = z.object({ pendingMinor: z.string(), availableMinor: z.string(), reservedMinor: z.string(), paidMinor: z.string(), entries: z.array(z.object({ id: z.string(), bucket: z.string(), type: z.string(), amountMinor: z.string(), createdAt: z.string() }).passthrough()) });
export const affiliateOrderSchema = z.object({ id: z.string(), number: z.string(), sellerName: z.string(), status: z.string(), subtotalMinor: z.string(), shippingMinor: z.string(), commissionMinor: z.string(), sellerNetMinor: z.string(), version: z.number(), items: z.array(z.unknown()), statusHistory: z.array(z.unknown()), issues: z.array(z.unknown()) }).passthrough();
export const affiliateShippingRateSchema = z.object({ id: z.string(), name: z.string(), priceMinor: z.string(), active: z.boolean() }).passthrough();
export const affiliateShippingZoneSchema = z.object({ id: z.string(), name: z.string(), active: z.boolean(), provinces: z.array(z.object({ id: z.string(), province: z.string() }).passthrough()), rates: z.array(affiliateShippingRateSchema) }).passthrough();
export const affiliatePickupPointSchema = z.object({ id: z.string(), name: z.string(), address: z.string(), active: z.boolean() }).passthrough();
export const affiliateLogisticsSchema = z.object({ zones: z.array(affiliateShippingZoneSchema), pickupPoints: z.array(affiliatePickupPointSchema) });
export type AffiliateProfile = z.infer<typeof affiliateProfileSchema>;
export type AffiliateListing = z.infer<typeof affiliateListingSchema>;
export type AffiliateBalance = z.infer<typeof affiliateBalanceSchema>;
export type AffiliateOrder = z.infer<typeof affiliateOrderSchema>;
export type AffiliateLogistics = z.infer<typeof affiliateLogisticsSchema>;
