import { describe, expect, it } from 'vitest';
import { adminDashboardEnvelopeSchema } from '@/features/admin-dashboard/domain/contracts';
import { adminProductDetailEnvelopeSchema, adminProductListEnvelopeSchema } from '@/features/product-management/domain/contracts';
import { fulfillmentEnvelopeSchema } from '@/features/fulfillment-management/domain/contracts';
import { auditListEnvelopeSchema } from '@/features/audit-log/domain/contracts';
import { adminLoginSchema } from '@/features/admin-auth/domain/contracts';
import { adminOrderSchema } from '@/features/order-management/domain/contracts';
import { adminTransferSettingsEnvelopeSchema } from '@/features/transfer-settings/domain/contracts';

const money = { amountMinor: '125000', currency: 'USD' as const };
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

  it('parses transfer settings with an optional CBU and alias', () => {
    const settings = adminTransferSettingsEnvelopeSchema.parse({ data: {
      enabled: true, bankName: 'Banco Demo', accountHolder: 'Card Shop', cbu: '1234567890123456789012', alias: null,
      version: 2, updatedAt: '2026-09-10T12:00:00.000Z', currency: 'USD',
    }, meta: {} });
    expect(settings.data.bankName).toBe('Banco Demo');
    expect(settings.data.alias).toBeNull();
  });

  it('parses fulfillment and redacted audit payloads', () => {
    const fulfillment = fulfillmentEnvelopeSchema.parse({ data: { shippingZones: [{ id: 'z1', name: 'AMBA', active: true, provinces: ['Buenos Aires'], rates: [{ id: 'r1', name: 'Estándar', price: money, active: true }], createdAt: '2026-09-08T12:00:00.000Z', updatedAt: '2026-09-08T12:00:00.000Z' }], pickupPoints: [] }, meta: {} });
    const audit = auditListEnvelopeSchema.parse({ data: [{ id: 'a1', actorType: 'ADMIN', actorId: 'admin-1', action: 'PRODUCT_UPDATED', entityType: 'Product', entityId: 'product-1', metadata: { email: '[REDACTED]' }, requestId: 'req-1', createdAt: '2026-09-08T12:00:00.000Z' }], meta: { nextCursor: null } });
    expect(fulfillment.data.shippingZones[0]?.rates[0]?.price.amountMinor).toBe('125000');
    expect(audit.data[0]?.metadata).toEqual({ email: '[REDACTED]' });
  });

  it('requires the discount and loyalty snapshot returned with administrative orders', () => {
    const discount = { amountMinor: '1500', currency: 'USD' as const };
    const order = adminOrderSchema.parse({
      id: 'order-1', number: 'CS-0001', version: 2, status: 'PAID',
      paymentMethod: 'BANK_TRANSFER', fulfillmentType: 'PICKUP',
      totals: { subtotal: money, discount, shipping: { ...money, amountMinor: '0' }, total: { ...money, amountMinor: '123500' } },
      loyalty: {
        programVersion: 3,
        pointsRedeemed: 1,
        pointsDiscount: discount,
        pointsEarned: 4,
        redemptionStatus: 'REDEEMED',
        spendPerPoint: { ...money, amountMinor: '30000' },
        pointValue: discount,
      },
      customer: { id: '11111111-1111-4111-8111-111111111111', email: 'trainer@example.com', name: 'Trainer', status: 'ACTIVE', emailVerifiedAt: '2026-09-08T11:00:00.000Z', createdAt: '2026-09-01T12:00:00.000Z' },
      fulfillment: { type: 'PICKUP', pickupPointId: 'pickup-1', name: 'Local', address: 'Ruta 10' },
      items: [], reservations: [], payment: null, receipts: [], timeline: [], allowedActions: [],
      expiresAt: null, createdAt: '2026-09-08T12:00:00.000Z', updatedAt: '2026-09-08T12:05:00.000Z',
    });

    expect(order.totals.discount.amountMinor).toBe('1500');
    expect(order.loyalty).toMatchObject({ pointsRedeemed: 1, pointsEarned: 4, redemptionStatus: 'REDEEMED' });
    expect(order.loyalty.pointsDiscount).toEqual(order.totals.discount);
  });
});
