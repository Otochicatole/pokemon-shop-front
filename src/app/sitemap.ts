import type { MetadataRoute } from 'next';
import { listProducts } from '@/features/catalog';
import { config } from '@/shared/config/env';

async function productEntries(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({ limit: '100' });
    if (cursor) params.set('cursor', cursor);
    const result = await listProducts(params).catch(() => null);
    if (!result?.data.length) break;
    for (const product of result.data) {
      entries.push({
        url: `${config.siteUrl}/products/${encodeURIComponent(product.slug)}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
    cursor = result.meta.nextCursor;
    if (!cursor) break;
  }
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: config.siteUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${config.siteUrl}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ];

  const products = await productEntries();
  return [...staticPages, ...products];
}
