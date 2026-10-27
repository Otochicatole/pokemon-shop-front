'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Money } from '@/shared/api/contracts';
import { ProductAvailability } from './ProductAvailability';
import { ProductImage } from './ProductImage';
import { ProductPrice } from './ProductPrice';
import { ProductTile } from './ProductTile';
import styles from './ProductCard.module.css';

export interface ProductCardImage { url: string; altText?: string | null; }
export interface ProductCardViewModel { name: string; slug: string; eyebrow: string; eyebrowData?: boolean; kindLabel: string; price: Money; available: number; image?: ProductCardImage; }
export interface ProductCardProps {
  product: ProductCardViewModel;
  details?: ReactNode;
  action?: ReactNode;
  imageBadge?: ReactNode;
  className?: string;
}

export function ProductCard({ product, details, action, imageBadge, className = '' }: ProductCardProps) {
  const href = `/products/${product.slug}`;
  return (
    <ProductTile className={className}>
      <ProductImage image={product.image} alt={product.name} href={href} />
      <div className={`${styles.productCardBody} product-card-body`}>
        <div className={styles.productMeta}><span>{product.kindLabel}</span>{imageBadge}</div>
        <p className={styles.collection}><span className={product.eyebrowData ? 'product-data' : undefined}>{product.eyebrow}</span></p>
        <Link href={href} className={styles.productName}><h3>{product.name}</h3></Link>
        {details}
        <div className={`${styles.productCardFooter} product-card-footer`}>
          <ProductPrice price={product.price} />
          {action}
        </div>
        <ProductAvailability available={product.available} />
      </div>
    </ProductTile>
  );
}
