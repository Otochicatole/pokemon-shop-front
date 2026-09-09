import { adminFetch } from '@/shared/admin/client';
import { supplierActiveEnvelopeSchema, supplierDetailEnvelopeSchema, supplierListEnvelopeSchema, type SupplierFormValues } from '../domain/contracts';

export interface SupplierListQuery {
  search?: string;
  active?: string;
  cursor?: string;
  limit?: number;
}

export async function listSuppliers(query: SupplierListQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.active === 'true' || query.active === 'false') params.set('active', query.active);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  return adminFetch(`/admin/suppliers?${params.toString()}`, {}, supplierListEnvelopeSchema);
}

function payload(values: SupplierFormValues) {
  return {
    name: values.name.trim(),
    contactName: values.contactName?.trim() || null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    address: values.address?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

export async function createSupplier(values: SupplierFormValues) {
  return adminFetch('/admin/suppliers', { method: 'POST', body: JSON.stringify(payload(values)) }, supplierDetailEnvelopeSchema);
}

export async function updateSupplier(id: string, version: number, values: SupplierFormValues) {
  return adminFetch(`/admin/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify({ ...payload(values), expectedVersion: version }) }, supplierDetailEnvelopeSchema);
}

export async function setSupplierActive(id: string, active: boolean, expectedVersion: number) {
  return adminFetch(`/admin/suppliers/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active, expectedVersion }) }, supplierActiveEnvelopeSchema);
}
