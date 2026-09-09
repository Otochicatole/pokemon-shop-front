import { z } from 'zod';
import { moneySchema } from '@/shared/api/contracts';

export const dashboardRangeSchema = z.enum(['TODAY', '7D', '30D']);
export type DashboardRange = z.infer<typeof dashboardRangeSchema>;

export const adminDashboardSchema = z.object({
  range: dashboardRangeSchema,
  since: z.string(),
  revenue: z.object({ gross: moneySchema, refunded: moneySchema, net: moneySchema, paidPayments: z.number().int().nonnegative(), refunds: z.number().int().nonnegative() }),
  orders: z.object({ total: z.number().int().nonnegative(), byStatus: z.record(z.string(), z.number().int().nonnegative()) }),
  products: z.object({ draft: z.number().int().nonnegative(), published: z.number().int().nonnegative(), archived: z.number().int().nonnegative(), outOfStock: z.number().int().nonnegative(), lowStock: z.number().int().nonnegative() }),
  attention: z.object({ transferReviews: z.number().int().nonnegative(), mercadoPagoReviews: z.number().int().nonnegative() }),
  integrations: z.object({ bankTransfer: z.boolean(), mercadoPago: z.boolean(), smtp: z.boolean() }),
  recentOrders: z.array(z.object({ id: z.string(), number: z.string(), status: z.string(), total: moneySchema, createdAt: z.string().or(z.date()) })),
  recentActivity: z.array(z.object({
    id: z.string(), actorType: z.string(), actorId: z.string().nullable(), action: z.string(),
    entityType: z.string(), entityId: z.string().nullable(), metadata: z.unknown(),
    requestId: z.string().nullable(), createdAt: z.string().or(z.date()),
  })),
});
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export const adminDashboardEnvelopeSchema = z.object({ data: adminDashboardSchema, meta: z.record(z.string(), z.unknown()).optional() });
