import { adminFetch } from '@/shared/admin/client';
import { adminProductDetailEnvelopeSchema, adminProductListEnvelopeSchema, inventoryHistoryEnvelopeSchema, inventoryMutationEnvelopeSchema, productImageOrderEnvelopeSchema, productImagesEnvelopeSchema, productImageUpdateEnvelopeSchema, productMutationEnvelopeSchema, productStatusEnvelopeSchema, tcgdexCardEnvelopeSchema, tcgdexSearchEnvelopeSchema, type AdminProduct, type AdminProductImage, type InventoryAdjustment, type ProductEditorValues } from '../domain/contracts';

export interface AdminProductQuery { search?: string; status?: string; kind?: string; stock?: string; pokemonType?: string; setName?: string; cursor?: string; limit?: number; }
export async function listAdminProducts(query: AdminProductQuery): Promise<{ data: AdminProduct[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  const response = await adminFetch(`/admin/products?${params}`, {}, adminProductListEnvelopeSchema);
  return { data: response.data, nextCursor: response.meta.nextCursor };
}
export async function getAdminProduct(id: string) { const response = await adminFetch(`/admin/products/${id}`, {}, adminProductDetailEnvelopeSchema); return response.data.product; }
export async function searchTcgdexCards(query: string) { const response = await adminFetch(`/admin/tcgdex/cards?q=${encodeURIComponent(query)}`, {}, tcgdexSearchEnvelopeSchema); return response.data; }
export async function getTcgdexCard(id: string) { const response = await adminFetch(`/admin/tcgdex/cards/${encodeURIComponent(id)}`, {}, tcgdexCardEnvelopeSchema); return response.data.card; }

function minorFromDecimal(value: string) {
  const normalized = value.replace(',', '.');
  const [integer, fraction = ''] = normalized.split('.');
  return (BigInt(integer || '0') * 100n + BigInt((fraction + '00').slice(0, 2))).toString();
}

function productBody(values: ProductEditorValues, existing: boolean) {
  const pokemonCard = values.kind === 'SINGLE_CARD' ? {
    pokemonType: values.pokemonType ?? null, setName: values.setName!, setCode: values.setCode || null, cardNumber: values.cardNumber!, rarity: values.rarity!, language: values.language!, condition: values.condition!, finish: values.finish || null, edition: values.edition || null, gradingCompany: values.gradingCompany || null, grade: values.grade || null, certificationNumber: values.certificationNumber || null,
  } : null;
  return { sku: values.sku, slug: values.slug, name: values.name, description: values.description, kind: values.kind, stockMode: values.stockMode, priceMinor: minorFromDecimal(values.price), pokemonCard, ...(!existing ? { initialStock: values.initialStock } : {}) };
}

export async function createAdminProduct(values: ProductEditorValues) {
  const response = await adminFetch('/admin/products', { method: 'POST', body: JSON.stringify(productBody(values, false)) }, productMutationEnvelopeSchema);
  return response.data.product;
}
export async function updateAdminProduct(id: string, version: number, values: ProductEditorValues) {
  const response = await adminFetch(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify({ ...productBody(values, true), expectedVersion: version }) }, productMutationEnvelopeSchema);
  return response.data.product;
}
export async function publishAdminProduct(id: string, version: number) { return adminFetch(`/admin/products/${id}/publish`, { method: 'POST', body: JSON.stringify({ expectedVersion: version }) }, productStatusEnvelopeSchema); }
export async function archiveAdminProduct(id: string, version: number) { return adminFetch(`/admin/products/${id}/archive`, { method: 'POST', body: JSON.stringify({ expectedVersion: version }) }, productStatusEnvelopeSchema); }
export async function adjustProductInventory(id: string, delta: number, reason: string) { return adminFetch(`/admin/products/${id}/inventory-adjustment`, { method: 'POST', body: JSON.stringify({ delta, reason }) }, inventoryMutationEnvelopeSchema); }
export async function listInventoryAdjustments(id: string, cursor?: string): Promise<{ data: InventoryAdjustment[]; nextCursor: string | null }> { const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''; const response = await adminFetch(`/admin/products/${id}/inventory-adjustments${params}`, {}, inventoryHistoryEnvelopeSchema); return { data: response.data, nextCursor: response.meta.nextCursor }; }

export async function uploadProductImages(id: string, version: number, files: File[], altTexts: string[]) { const body = new FormData(); body.append('expectedVersion', String(version)); files.forEach((file) => body.append('images', file)); altTexts.forEach((alt) => body.append('altText', alt)); return adminFetch(`/admin/products/${id}/images`, { method: 'POST', body }, productImagesEnvelopeSchema); }
export async function importTcgdexImage(id: string, version: number, imageUrl: string) { return adminFetch(`/admin/products/${id}/tcgdex-image`, { method: 'POST', body: JSON.stringify({ expectedVersion: version, imageUrl }) }, productImagesEnvelopeSchema); }
export async function updateProductImage(id: string, imageId: string, version: number, altText: string) { return adminFetch(`/admin/products/${id}/images/${imageId}`, { method: 'PATCH', body: JSON.stringify({ expectedVersion: version, altText }) }, productImageUpdateEnvelopeSchema); }
export async function reorderProductImages(id: string, version: number, images: AdminProductImage[]) { return adminFetch(`/admin/products/${id}/images/order`, { method: 'PUT', body: JSON.stringify({ expectedVersion: version, imageIds: images.map((image) => image.id) }) }, productImageOrderEnvelopeSchema); }
export async function removeProductImage(id: string, imageId: string, version: number) { return adminFetch(`/admin/products/${id}/images/${imageId}`, { method: 'DELETE', body: JSON.stringify({ expectedVersion: version }) }); }
