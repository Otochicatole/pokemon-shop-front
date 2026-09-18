import { adminFetch } from '@/shared/admin/client';
import {
  supplierActiveEnvelopeSchema,
  supplierDetailEnvelopeSchema,
  supplierListEnvelopeSchema,
  supplierPurchaseDetailEnvelopeSchema,
  supplierPurchaseListEnvelopeSchema,
  type PurchaseFormValues,
  type PurchaseLineFormValues,
  type SupplierFormValues,
} from '../domain/contracts';

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

export async function getSupplier(id: string) {
  const response = await adminFetch(`/admin/suppliers/${id}`, {}, supplierDetailEnvelopeSchema);
  return response.data.supplier;
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

export async function listSupplierPurchases(supplierId: string, cursor?: string, limit = 25) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  return adminFetch(`/admin/suppliers/${supplierId}/purchases?${params.toString()}`, {}, supplierPurchaseListEnvelopeSchema);
}

export async function getSupplierPurchase(supplierId: string, purchaseId: string) {
  const response = await adminFetch(`/admin/suppliers/${supplierId}/purchases/${purchaseId}`, {}, supplierPurchaseDetailEnvelopeSchema);
  return response.data.purchase;
}

function minorFromDecimal(value: string) {
  const normalized = value.replace(',', '.');
  const [integer, fraction = ''] = normalized.split('.');
  return (BigInt(integer || '0') * 100n + BigInt((fraction + '00').slice(0, 2))).toString();
}

function productWriteFromLine(item: PurchaseLineFormValues) {
  const pokemonCard = item.kind === 'SINGLE_CARD' ? {
    pokemonType: item.pokemonType ?? null,
    setName: item.setName!,
    setCode: item.setCode || null,
    cardNumber: item.cardNumber!,
    rarity: item.rarity!,
    language: item.language!,
    condition: item.condition!,
    finish: item.finish || null,
    edition: item.edition || null,
    gradingCompany: item.gradingCompany || null,
    grade: item.grade || null,
    certificationNumber: item.certificationNumber || null,
  } : null;
  return {
    sku: item.sku.trim(),
    slug: item.slug.trim(),
    name: item.name.trim(),
    description: item.description.trim(),
    kind: item.kind,
    stockMode: item.stockMode,
    priceMinor: minorFromDecimal(item.price),
    costMinor: minorFromDecimal(item.unitCost),
    initialStock: 0,
    pokemonCard,
  };
}

export async function createSupplierPurchase(supplierId: string, values: PurchaseFormValues) {
  const body = {
    purchasedAt: new Date(`${values.purchasedAt}Z`).toISOString(),
    note: values.note?.trim() || null,
    items: values.items.map((item) => {
      const base = {
        quantity: item.quantity,
        unitCostMinor: minorFromDecimal(item.unitCost),
      };
      if (item.productId) return { ...base, productId: item.productId };
      return { ...base, product: productWriteFromLine(item) };
    }),
  };
  const response = await adminFetch(`/admin/suppliers/${supplierId}/purchases`, { method: 'POST', body: JSON.stringify(body) }, supplierPurchaseDetailEnvelopeSchema);
  return response.data.purchase;
}

export async function deleteSupplierPurchase(supplierId: string, purchaseId: string) {
  return adminFetch(`/admin/suppliers/${supplierId}/purchases/${purchaseId}`, { method: 'DELETE' });
}
