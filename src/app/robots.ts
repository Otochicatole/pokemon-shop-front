import type { MetadataRoute } from 'next';
import { config } from '@/shared/config/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/account',
          '/account/',
          '/auth/',
          '/checkout',
          '/cart',
          '/api/',
        ],
      },
    ],
    sitemap: `${config.siteUrl}/sitemap.xml`,
    host: config.siteUrl,
  };
}
