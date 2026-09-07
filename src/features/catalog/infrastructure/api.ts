import { apiFetch } from '@/shared/api/client';
import { productListSchema, productSchema, type Product } from '@/shared/api/contracts';
export async function listProducts(params: URLSearchParams = new URLSearchParams()) { return apiFetch(`/catalog/products?${params.toString()}`, {}, productListSchema); }
export async function getProduct(slug: string): Promise<Product> { const data = await apiFetch(`/catalog/products/${encodeURIComponent(slug)}`) as { product: unknown }; return productSchema.parse(data.product); }
