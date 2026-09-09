import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Money } from '@/shared/api/contracts';
import { ProductAvailability } from './ProductAvailability';
import { ProductImage } from './ProductImage';
import { ProductPrice } from './ProductPrice';
import { ProductTile } from './ProductTile';

export interface ProductCardImage { url: string; altText?: string | null; }
export interface ProductCardViewModel { name: string; slug: string; eyebrow: string; kindLabel: string; price: Money; available: number; image?: ProductCardImage; }
export interface ProductCardProps { product: ProductCardViewModel; details?: ReactNode; action?: ReactNode; className?: string; }

export function ProductCard({ product, details, action, className = '' }: ProductCardProps) {
  const href = `/products/${product.slug}`;
  return <ProductTile className={className}><ProductImage image={product.image} alt={product.name} href={href} kind={product.kindLabel} /><div className="product-card-body"><p className="eyebrow">{product.eyebrow}</p><Link href={href}><h3>{product.name}</h3></Link>{details}<div className="product-card-footer"><ProductPrice price={product.price} />{action}</div><ProductAvailability available={product.available} /></div></ProductTile>;
}
