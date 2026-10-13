import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct } from '@/features/catalog';
import { config, absoluteUrl } from '@/shared/config/env';

import { ProductDetails } from './product-details';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) {
    return { title: 'Producto no encontrado', robots: { index: false, follow: false } };
  }
  const description = product.description?.trim()
    || `${product.name} en ${config.storeName}. Stock real y compra protegida.`;
  const image = product.images[0]?.url;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${encodeURIComponent(product.slug)}` },
    openGraph: {
      type: 'website',
      title: `${product.name} · ${config.storeName}`,
      description,
      url: `/products/${encodeURIComponent(product.slug)}`,
      images: image ? [{ url: image, alt: product.images[0]?.altText ?? product.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description,
            sku: product.sku,
            image: product.images.map((image) => image.url),
            brand: { '@type': 'Brand', name: product.seller.name },
            offers: {
              '@type': 'Offer',
              url: absoluteUrl(`/products/${encodeURIComponent(product.slug)}`),
              priceCurrency: product.price.currency,
              price: (Number(product.price.amountMinor) / 100).toFixed(2),
              availability: product.available > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              seller: { '@type': 'Organization', name: product.seller.name },
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
      <ProductDetails product={product} />
    </>
  );
}
