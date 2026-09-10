import { z } from 'zod';
import { adminOrderSchema } from '@/features/order-management';
import { loyaltyAccountSchema, moneySchema } from '@/shared/api/contracts';

export const adminCustomerSchema = z.object({
  id: z.string(), email: z.string(), name: z.string().nullable(), status: z.enum(['ACTIVE', 'SUSPENDED']),
  emailVerifiedAt: z.string().nullable(), createdAt: z.string(), ordersCount: z.number().int().optional(), paidTotal: moneySchema.optional(),
  loyalty: loyaltyAccountSchema,
});
export type AdminCustomer = z.infer<typeof adminCustomerSchema>;
export const customerListEnvelopeSchema = z.object({ data: z.array(adminCustomerSchema), meta: z.object({ nextCursor: z.string().nullable() }) });
export const customerDetailEnvelopeSchema = z.object({
  data: z.object({
    customer: adminCustomerSchema.extend({
      ordersCount: z.number().int(),
      paidTotal: moneySchema,
      updatedAt: z.string(),
      // Kept temporarily for compatibility with databases served by an older v2 process.
      orders: z.array(adminOrderSchema).optional(),
    }),
  }),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export const customerOrderListEnvelopeSchema = z.object({
  data: z.array(adminOrderSchema),
  meta: z.object({ nextCursor: z.string().nullable() }),
});
export type AdminCustomerDetail = z.infer<typeof customerDetailEnvelopeSchema>['data']['customer'];
