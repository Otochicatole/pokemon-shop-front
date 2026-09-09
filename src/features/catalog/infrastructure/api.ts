import { apiFetch } from '@/shared/api/client';
import { catalogFiltersEnvelopeSchema, productListSchema, productSchema, type CatalogFilters, type Product } from '@/shared/api/contracts';
export async function listProducts(params: URLSearchParams = new URLSearchParams()) { return apiFetch(`/catalog/products?${params.toString()}`, {}, productListSchema); }
export async function getProduct(slug: string): Promise<Product> { const data = await apiFetch(`/catalog/products/${encodeURIComponent(slug)}`) as { data: unknown }; return productSchema.parse(data.data); }
export async function getCatalogFilters(): Promise<CatalogFilters> {
  const response = await apiFetch('/catalog/filters', {}, catalogFiltersEnvelopeSchema);
  return response.data;
}
