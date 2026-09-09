import type { PokemonType, Product } from '@/shared/api/contracts';
import { ProductCard as BaseProductCard } from '@/components/product';
import { PixelBadge, type BadgeTone } from '@/components/badge';
import { AddToCartButton } from '@/features/cart/ui/add-to-cart-button';
import { conditionLabels, pokemonTypeLabels, productKindLabels } from '../domain/catalog-filters';

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
  return (
    <BaseProductCard
      product={{ name: product.name, slug: product.slug, eyebrow: card?.setName ?? product.sku, kindLabel, price: product.price, available: product.available, image: product.images[0] }}
      details={card ? <div className="product-card-details">{card.pokemonType && <PixelBadge tone={typeTones[card.pokemonType] ?? 'cyan'}>{pokemonTypeLabels[card.pokemonType]}</PixelBadge>}<span>{conditionLabels[card.condition]} · {card.language}</span></div> : <div className="product-card-details"><span>{productKindLabels[product.kind]}</span></div>}
      action={<AddToCartButton product={product} compact />}
    />
  );
}
