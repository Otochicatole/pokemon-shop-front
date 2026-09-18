import { apiFetch } from '@/shared/api/client';
import { catalogFiltersEnvelopeSchema, productListSchema, productSchema, type CatalogFilters, type Product } from '@/shared/api/contracts';

const noStore = { cache: 'no-store' as const };

export async function listProducts(params: URLSearchParams = new URLSearchParams()) {
  return apiFetch(`/catalog/products?${params.toString()}`, noStore, productListSchema);
}

export async function getProduct(slug: string): Promise<Product> {
  const data = await apiFetch(`/catalog/products/${encodeURIComponent(slug)}`, noStore) as { data: unknown };
  return productSchema.parse(data.data);
}

export async function getCatalogFilters(): Promise<CatalogFilters> {
  const response = await apiFetch('/catalog/filters', noStore, catalogFiltersEnvelopeSchema);
  return response.data;
}
