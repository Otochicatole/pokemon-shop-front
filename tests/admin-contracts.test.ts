import { describe, expect, it } from 'vitest';
import { adminDashboardEnvelopeSchema } from '@/features/admin-dashboard/domain/contracts';
import { adminProductDetailEnvelopeSchema, adminProductListEnvelopeSchema } from '@/features/product-management/domain/contracts';
import { fulfillmentEnvelopeSchema } from '@/features/fulfillment-management/domain/contracts';
import { auditListEnvelopeSchema } from '@/features/audit-log/domain/contracts';
import { adminLoginSchema } from '@/features/admin-auth/domain/contracts';

const money = { amountMinor: '125000', currency: 'ARS' as const };
const product = {
  id: 'product-1', sku: 'PKM-001', slug: 'carta-demo', name: 'Carta demo', description: 'Demo', kind: 'SINGLE_CARD' as const,
  stockMode: 'UNIQUE' as const, status: 'DRAFT' as const, version: 1, price: money,
  inventory: { onHand: 1, reserved: 0, available: 1, version: 1 }, pokemonCard: null, images: [],
  publishedAt: null, archivedAt: null, createdAt: '2026-09-08T12:00:00.000Z', updatedAt: '2026-09-08T12:00:00.000Z',
};

describe('admin API contracts', () => {
  it('accepts an administrative login with email and password only', () => {
    expect(adminLoginSchema.parse({ email: 'admin@cardshop.test', password: 'secret' })).toEqual({
      email: 'admin@cardshop.test',
      password: 'secret',
    });
    expect(adminLoginSchema.safeParse({ email: 'admin@cardshop.test', password: 'secret', otp: '123456' }).success).toBe(false);
  });

  it('parses the list and detail product envelopes without flattening data.product', () => {
    expect(adminProductListEnvelopeSchema.parse({ data: [product], meta: { nextCursor: null } }).data).toHaveLength(1);
    expect(adminProductDetailEnvelopeSchema.parse({ data: { product }, meta: {} }).data.product.sku).toBe('PKM-001');
  });

  it('accepts backend dashboard range codes and integer money', () => {
    const parsed = adminDashboardEnvelopeSchema.parse({ data: { range: '7D', since: '2026-09-01T00:00:00.000Z', revenue: { gross: money, refunded: { ...money, amountMinor: '0' }, net: money, paidPayments: 2, refunds: 0 }, orders: { total: 2, byStatus: { PAID: 2 } }, products: { draft: 1, published: 2, archived: 0, outOfStock: 0, lowStock: 1 }, attention: { transferReviews: 1, mercadoPagoReviews: 0 }, integrations: { bankTransfer: true, mercadoPago: false, smtp: true }, recentOrders: [], recentActivity: [] }, meta: {} });
    expect(parsed.data.range).toBe('7D');
  });

  it('parses fulfillment and redacted audit payloads', () => {
    const fulfillment = fulfillmentEnvelopeSchema.parse({ data: { shippingZones: [{ id: 'z1', name: 'AMBA', active: true, provinces: ['Buenos Aires'], rates: [{ id: 'r1', name: 'Estándar', price: money, active: true }], createdAt: '2026-09-08T12:00:00.000Z', updatedAt: '2026-09-08T12:00:00.000Z' }], pickupPoints: [] }, meta: {} });
    const audit = auditListEnvelopeSchema.parse({ data: [{ id: 'a1', actorType: 'ADMIN', actorId: 'admin-1', action: 'PRODUCT_UPDATED', entityType: 'Product', entityId: 'product-1', metadata: { email: '[REDACTED]' }, requestId: 'req-1', createdAt: '2026-09-08T12:00:00.000Z' }], meta: { nextCursor: null } });
    expect(fulfillment.data.shippingZones[0]?.rates[0]?.price.amountMinor).toBe('125000');
    expect(audit.data[0]?.metadata).toEqual({ email: '[REDACTED]' });
  });
});
