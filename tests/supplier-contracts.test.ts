import { describe, expect, it } from 'vitest';
import { supplierActiveEnvelopeSchema, supplierDetailEnvelopeSchema, supplierFormSchema, supplierListEnvelopeSchema } from '@/features/supplier-management/domain/contracts';

const supplier = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', name: 'Mazo Central', contactName: null, email: null, phone: null, address: null, notes: null,
  active: true, version: 1, createdAt: '2026-09-09T12:00:00.000Z', updatedAt: '2026-09-09T12:00:00.000Z',
};

describe('supplier contracts', () => {
  it('accepts list/detail and lifecycle envelopes', () => {
    expect(supplierListEnvelopeSchema.parse({ data: [supplier], meta: { nextCursor: null } }).data).toHaveLength(1);
    expect(supplierDetailEnvelopeSchema.parse({ data: { supplier }, meta: {} }).data.supplier.name).toBe('Mazo Central');
    expect(supplierActiveEnvelopeSchema.parse({ data: { id: supplier.id, active: false, version: 2 }, meta: {} }).data.active).toBe(false);
  });

  it('requires only the name and validates optional email', () => {
    expect(supplierFormSchema.parse({ name: '  Proveedor  ' })).toEqual({ name: 'Proveedor' });
    expect(supplierFormSchema.safeParse({ name: 'Proveedor', email: 'invalid' }).success).toBe(false);
  });
});
