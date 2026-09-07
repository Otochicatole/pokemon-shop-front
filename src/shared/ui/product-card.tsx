import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/shared/api/contracts';
import { formatMoney } from '@/shared/lib/format';
import { AddToCartButton } from '@/features/cart/ui/add-to-cart-button';
import { ProductTile } from './pixel-primitives';
export function ProductCard({ product }: { product: Product }) { const image = product.images[0]; return <ProductTile><Link href={`/products/${product.slug}`} className="product-image">{image ? <Image src={image.url} alt={image.altText || product.name} fill sizes="(max-width: 640px) 50vw, 25vw" /> : <div className="image-placeholder"><span>◈</span></div>}<span className="product-kind">{product.kind === 'SINGLE_CARD' ? 'Carta' : 'Sellado'}</span></Link><div className="product-card-body"><p className="eyebrow">{product.pokemonCard?.setName ?? product.sku}</p><Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link><div className="product-card-footer"><strong>{formatMoney(product.price)}</strong><AddToCartButton product={product} compact /></div>{product.available === 0 ? <p className="stock-muted">Agotado</p> : product.available <= 2 ? <p className="stock-warn">Últimas {product.available} unidades</p> : null}</div></ProductTile>; }
