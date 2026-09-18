'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import type { Money } from '@/shared/api/contracts';
import { flipProductCard, useFlippedProductSlug } from './flipped-product-card';
import { ProductAvailability } from './ProductAvailability';
import { ProductImage } from './ProductImage';
import { ProductPrice } from './ProductPrice';
import { ProductTile } from './ProductTile';
import styles from './ProductCard.module.css';

export interface ProductCardImage { url: string; altText?: string | null; }
export interface ProductCardViewModel {
  name: string;
  slug: string;
  eyebrow: string;
  kindLabel: string;
  price: Money;
  available: number;
  image?: ProductCardImage;
}
export interface ProductCardProps {
  product: ProductCardViewModel;
  details?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function canHoverFlip() {
  return typeof window !== 'undefined'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function ProductCard({ product, details, action, className = '' }: ProductCardProps) {
  const href = `/products/${product.slug}`;
  const router = useRouter();
  const flippedSlug = useFlippedProductSlug();
  const flipped = flippedSlug === product.slug;

  const goToProduct = () => router.push(href);

  const onCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('a, button')) return;

    if (canHoverFlip()) {
      goToProduct();
      return;
    }

    // Móvil: toggle — misma carta cierra, otra abre solo esa
    flipProductCard(product.slug);
  };

  const onCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as HTMLElement;
    if (target.closest('a, button')) return;
    event.preventDefault();

    if (canHoverFlip()) {
      goToProduct();
      return;
    }

    flipProductCard(product.slug);
  };

  return (
    <ProductTile
      className={[styles.flipCard, flipped ? styles.flipped : '', className].filter(Boolean).join(' ')}
      data-product-flip-card=""
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      tabIndex={0}
      aria-label={product.name}
      aria-expanded={flipped}
    >
      <div className={styles.flipInner}>
        <div className={`${styles.flipFront} product-card-front`}>
          <ProductImage image={product.image} alt={product.name} className={styles.frontImage} />
        </div>

        <div className={`${styles.flipBack} product-card-back`}>
          <div className={`${styles.productCardBody} product-card-body`}>
            <div className={styles.backTop}>
              <p className={`eyebrow ${styles.eyebrow}`}>{product.eyebrow}</p>
              <Link href={href} className={styles.titleLink}>
                <h3 className={styles.title}>{product.name}</h3>
              </Link>
              <span className={styles.kindLabel}>{product.kindLabel}</span>
            </div>

            {details ? <div className={styles.backMeta}>{details}</div> : null}

            <div className={styles.backBottom}>
              <div className={`${styles.productCardFooter} product-card-footer`}>
                <ProductPrice price={product.price} className={styles.price} />
                {action}
              </div>
              <ProductAvailability available={product.available} />
            </div>
          </div>
        </div>
      </div>
    </ProductTile>
  );
}
