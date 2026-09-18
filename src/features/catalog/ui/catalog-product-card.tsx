import type { Product } from '@/shared/api/contracts';
import { ProductCard as BaseProductCard } from '@/components/product';
import { AddToCartButton } from '@/features/cart/ui/add-to-cart-button';
import { conditionLabels, pokemonTypeLabels, productKindLabels } from '../domain/catalog-filters';
import styles from './catalog-product-card.module.css';

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.specCell}>
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
  );
}

function CardSpecs({ product }: { product: Product }) {
  const card = product.pokemonCard;

  if (card) {
    const setValue = card.setCode ? `${card.setName} · ${card.setCode}` : card.setName;
    return (
      <div className={styles.specsPanel}>
        <div className={styles.specsHeading}>
          <span>Especificaciones</span>
          <span>Detalles de la carta</span>
        </div>
        <dl className={styles.specs}>
          <SpecCell label="Tipo / atributo" value={card.pokemonType ? pokemonTypeLabels[card.pokemonType] : '—'} />
          <SpecCell label="Set" value={setValue} />
          <SpecCell label="Número" value={card.cardNumber || '—'} />
          <SpecCell label="Rareza" value={card.rarity || '—'} />
          <SpecCell label="Condición" value={conditionLabels[card.condition]} />
          <SpecCell label="Idioma" value={card.language || '—'} />
          <SpecCell label="Acabado" value={card.finish || '—'} />
          <SpecCell label="Edición" value={card.edition || '—'} />
        </dl>
        <small className={styles.productCardSeller}>Vende: {product.seller.name}</small>
      </div>
    );
  }

  return (
    <div className={styles.specsPanel}>
      <div className={styles.specsHeading}>
        <span>Especificaciones</span>
        <span>Detalles del producto</span>
      </div>
      <dl className={styles.specs}>
        <SpecCell label="Categoría" value={productKindLabels[product.kind]} />
        <SpecCell label="SKU" value={product.sku} />
        <SpecCell label="Vendedor" value={product.seller.name} />
        <SpecCell label="Modo stock" value={product.stockMode === 'UNIQUE' ? 'Único' : 'Cantidad'} />
      </dl>
    </div>
  );
}

export function CatalogProductCard({ product }: { product: Product }) {
  const card = product.pokemonCard;
  const kindLabel = product.kind === 'SINGLE_CARD' ? 'Carta' : product.kind === 'SEALED_PRODUCT' ? 'Sellado' : 'Accesorio';
  const cardClass = [
    product.kind === 'SINGLE_CARD' ? styles.productCardSingle : '',
    product.kind === 'SINGLE_CARD' ? 'product-card-single' : '',
  ].filter(Boolean).join(' ');

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
      details={<CardSpecs product={product} />}
      action={<AddToCartButton product={product} compact />}
    />
  );
}
