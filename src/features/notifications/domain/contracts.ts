import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'SUPPORT_MESSAGE',
  'ORDER_STATUS_CHANGED',
  'ORDER_CREATED',
  'TRANSFER_RECEIPT_SUBMITTED',
  'PAYMENT_REQUIRES_REVIEW',
  'PAYMENT_APPROVED',
  'AFFILIATE_LISTING_SUBMITTED',
  'AFFILIATE_LISTING_REVIEWED',
  'AFFILIATE_ORDER_CREATED',
  'AFFILIATE_ORDER_STATUS_CHANGED',
  'AFFILIATE_ISSUE_OPENED',
  'AFFILIATE_CANCELLATION_REQUESTED',
  'AFFILIATE_CANCELLATION_UPDATED',
  'AFFILIATE_PAYOUT_REQUESTED',
  'AFFILIATE_PAYOUT_UPDATED',
]);

export const notificationReferenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ORDER'), orderNumber: z.string().min(1) }),
  z.object({ kind: z.literal('SELLER_ORDER'), sellerOrderId: z.string().uuid(), orderNumber: z.string().min(1) }),
  z.object({ kind: z.literal('AFFILIATE_LISTING'), listingId: z.string().uuid(), productName: z.string() }),
  z.object({ kind: z.literal('AFFILIATE_PAYOUT'), payoutId: z.string().uuid() }),
  z.object({ kind: z.literal('SUPPORT_CONVERSATION'), conversationId: z.string().uuid() }),
]);

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  reference: notificationReferenceSchema.nullable(),
});

export const notificationListEnvelopeSchema = z.object({
  data: z.array(notificationSchema),
  meta: z.object({ nextCursor: z.string().nullable() }).passthrough(),
});

export const notificationUnreadEnvelopeSchema = z.object({
  data: z.object({ count: z.number().int().nonnegative() }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const notificationReadEnvelopeSchema = z.object({
  data: z.object({
    notification: notificationSchema,
    unreadCount: z.number().int().nonnegative(),
  }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const notificationReadAllEnvelopeSchema = z.object({
  data: z.object({ updatedCount: z.number().int().nonnegative(), unreadCount: z.number().int().nonnegative() }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
