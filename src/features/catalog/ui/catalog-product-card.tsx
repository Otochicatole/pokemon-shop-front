import type { Product } from '@/shared/api/contracts';
import { ProductCard as BaseProductCard } from '@/components/product';
import { AddToCartButton } from '@/features/cart/ui/add-to-cart-button';

export function CatalogProductCard({ product }: { product: Product }) {
  return <BaseProductCard product={{ name: product.name, slug: product.slug, eyebrow: product.pokemonCard?.setName ?? product.sku, kindLabel: product.kind === 'SINGLE_CARD' ? 'Carta' : 'Sellado', price: product.price, available: product.available, image: product.images[0] }} action={<AddToCartButton product={product} compact />} />;
}
