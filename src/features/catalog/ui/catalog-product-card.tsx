'use client';

import type { PokemonType, Product } from '@/shared/api/contracts';
import { ProductCard as BaseProductCard } from '@/components/product';
import { PixelBadge, type BadgeTone } from '@/components/badge';
import { AddToCartButton } from '@/features/cart/ui/add-to-cart-button';
import { pokemonTypeLabels } from '../domain/catalog-filters';
import styles from './catalog-product-card.module.css';

const typeTones: Partial<Record<PokemonType, BadgeTone>> = {
  FIRE: 'red',
  WATER: 'cyan',
  GRASS: 'green',
  LIGHTNING: 'yellow',
  PSYCHIC: 'purple',
};

export function CatalogProductCard({ product }: { product: Product }) {
  const card = product.pokemonCard;
  const kindLabel = product.kind === 'SINGLE_CARD' ? 'Carta' : product.kind === 'SEALED_PRODUCT' ? 'Sellado' : 'Accesorio';
  const cardClass = [
    styles.productCard,
    product.kind === 'SINGLE_CARD' ? styles.productCardSingle : '',
    product.kind === 'SINGLE_CARD' ? 'product-card-single' : '',
  ].filter(Boolean).join(' ');

  const typeBadge = card?.pokemonType ? (
    <PixelBadge tone={typeTones[card.pokemonType] ?? 'cyan'} className={styles.typeBadge}>
      {pokemonTypeLabels[card.pokemonType]}
    </PixelBadge>
  ) : null;

  return (
    <BaseProductCard
      className={cardClass}
      product={{
        name: product.name,
        slug: product.slug,
        eyebrow: card?.setName ?? product.sku,
        kindLabel,
        price: product.price,
        available: product.available,
        image: product.images[0],
      }}
      imageBadge={typeBadge}
      action={<AddToCartButton product={product} compact />}
    />
  );
}