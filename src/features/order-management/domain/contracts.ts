import { z } from 'zod';
import { moneySchema, orderLoyaltySchema } from '@/shared/api/contracts';

export const adminOrderStatusSchema = z.enum(['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUND_RECORDED', 'PAYMENT_REQUIRES_REVIEW']);
export const adminPaymentStatusSchema = z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FAILED', 'REFUNDED', 'DISPUTED', 'REQUIRES_REVIEW']);
export const adminOrderActionSchema = z.enum(['TRANSITION_PREPARING', 'TRANSITION_READY_FOR_PICKUP', 'TRANSITION_SHIPPED', 'TRANSITION_COMPLETED', 'CANCEL', 'REVIEW_TRANSFER', 'FULFILL_LATE_PAYMENT', 'RECORD_FULL_REFUND']);
const customerSchema = z.object({ id: z.string().uuid(), email: z.email(), name: z.string().nullable(), status: z.enum(['ACTIVE', 'SUSPENDED']), emailVerifiedAt: z.string().nullable(), createdAt: z.string() });
const itemSchema = z.object({ id: z.string(), productId: z.string(), sku: z.string(), name: z.string(), imageFileId: z.string().nullable(), imageUrl: z.string().nullable(), unitPrice: moneySchema, quantity: z.number().int(), lineTotal: moneySchema, snapshot: z.unknown() });
const reservationSchema = z.object({ id: z.string(), productId: z.string(), quantity: z.number().int(), expiresAt: z.string(), releasedAt: z.string().nullable(), consumedAt: z.string().nullable() });
const receiptSchema = z.object({ id: z.string(), fileId: z.string(), url: z.string(), review: z.enum(['PENDING', 'APPROVED', 'REJECTED']), note: z.string().nullable(), createdAt: z.string(), reviewedAt: z.string().nullable(), reviewedById: z.string().nullable() });
const timelineSchema = z.object({ id: z.string(), orderId: z.string(), fromStatus: adminOrderStatusSchema.nullable(), toStatus: adminOrderStatusSchema, note: z.string().nullable(), createdAt: z.string(), changedById: z.string().nullable() });
const paymentSchema = z.object({
  id: z.string(), method: z.enum(['BANK_TRANSFER', 'MERCADO_PAGO']), status: adminPaymentStatusSchema,
  amount: moneySchema, providerReference: z.string().nullable(),
  bankTransfer: z.object({ id: z.string(), paymentId: z.string(), reference: z.string(), reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']), reviewedAt: z.string().nullable(), reviewedById: z.string().nullable() }).nullable(),
  mercadoPago: z.object({ id: z.string(), paymentId: z.string(), externalPaymentId: z.string().nullable(), status: z.string().nullable(), statusDetail: z.string().nullable(), preferenceId: z.string().nullable(), checkoutUrl: z.string().nullable(), expiresAt: z.string().nullable() }).nullable(),
  refunds: z.array(z.object({ id: z.string(), amount: moneySchema, reason: z.string(), externalReference: z.string(), createdAt: z.string() })),
});

const shipmentSchema = z.object({
  type: z.literal('SHIPMENT'), shippingRateId: z.string().nullable(), zoneName: z.string().nullable(),
  rateName: z.string().nullable(), ratePrice: moneySchema.nullable(), recipientName: z.string().nullable(),
  recipientPhone: z.string().nullable(), addressLine1: z.string().nullable(), addressLine2: z.string().nullable(),
  city: z.string().nullable(), province: z.string().nullable(), postalCode: z.string().nullable(),
});
const pickupSchema = z.object({ type: z.literal('PICKUP'), pickupPointId: z.string().nullable(), name: z.string().nullable(), address: z.string().nullable() });

export const adminOrderSchema = z.object({
  id: z.string(), number: z.string(), version: z.number().int(), status: adminOrderStatusSchema,
  paymentMethod: z.enum(['BANK_TRANSFER', 'MERCADO_PAGO']), fulfillmentType: z.enum(['SHIPMENT', 'PICKUP']),
  totals: z.object({ subtotal: moneySchema, discount: moneySchema, shipping: moneySchema, total: moneySchema }),
  loyalty: orderLoyaltySchema,
  customer: customerSchema,
  fulfillment: z.discriminatedUnion('type', [shipmentSchema, pickupSchema]), items: z.array(itemSchema), reservations: z.array(reservationSchema),
  payment: paymentSchema.nullable(), receipts: z.array(receiptSchema), timeline: z.array(timelineSchema), allowedActions: z.array(adminOrderActionSchema),
  expiresAt: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(),
});
export type AdminOrder = z.infer<typeof adminOrderSchema>;
export type AdminReceipt = z.infer<typeof receiptSchema>;
export const orderListEnvelopeSchema = z.object({ data: z.array(adminOrderSchema), meta: z.object({ nextCursor: z.string().nullable() }) });
export const orderDetailEnvelopeSchema = z.object({ data: z.object({ order: adminOrderSchema }), meta: z.record(z.string(), z.unknown()).optional() });
export const orderStatusEnvelopeSchema = z.object({ data: z.object({ number: z.string(), status: adminOrderStatusSchema, version: z.number().int() }), meta: z.record(z.string(), z.unknown()).optional() });
export const transferReviewEnvelopeSchema = z.object({ data: z.object({ number: z.string(), receiptId: z.string(), decision: z.enum(['APPROVED', 'REJECTED']), status: z.enum(['PAID', 'CANCELLED']), version: z.number().int() }), meta: z.record(z.string(), z.unknown()).optional() });
export const fullRefundEnvelopeSchema = z.object({ data: z.object({ refundId: z.string(), number: z.string(), status: z.literal('REFUND_RECORDED'), amount: moneySchema, version: z.number().int() }), meta: z.record(z.string(), z.unknown()).optional() });
