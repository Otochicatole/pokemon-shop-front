import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, pokemonTypeLabels } from '@/features/catalog';
import { AddToCartButton } from '@/features/cart/ui/add-to-cart-button';
import { formatMoney } from '@/shared/lib/format';

import styles from './page.module.css';
import { ProductImageGallery } from './product-image-gallery';


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  return { title: product?.name ?? 'Producto', description: product?.description };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();
  const kindLabel = product.kind === 'SINGLE_CARD' ? 'Carta individual' : product.kind === 'SEALED_PRODUCT' ? 'Producto sellado' : 'Accesorio';
  const availabilityLabel = product.available > 0 ? `${product.available} unidades disponibles` : 'Sin stock disponible';

  return (
    <section className={`${styles.productDetail} page-container product-detail`}>
      <Link href="/catalog" className={`${styles.backLink} back-link`}>← Volver al catálogo</Link>
      <div className={`${styles.detailGrid} detail-grid`}>
        <ProductImageGallery images={product.images} productName={product.name} sku={product.sku} />
        <div className={`${styles.detailCopy} detail-copy`}>
          <div className={`${styles.detailKicker} detail-kicker`}><span className="pixel-badge pixel-badge-yellow">{kindLabel}</span><span className={`${styles.detailCode} detail-code`}>SKU {product.sku}</span></div>
          <h1>{product.name}</h1>
          <p className={`${styles.productSellerLine} product-seller-line`}>Vendido por <strong>{product.seller.name}</strong></p>
          <div className={`${styles.detailPriceRow} detail-price-row`}><p className={`${styles.detailPrice} detail-price`}>{formatMoney(product.price)}</p><span className={`${styles.detailStockChip} ${product.available > 0 ? `${styles.isAvailable} is-available` : `${styles.isEmpty} is-empty`} detail-stock-chip`}>{product.available > 0 ? 'Disponible' : 'Agotado'}</span></div>
          <section className={`${styles.detailDescriptionBlock} detail-description-block`} aria-labelledby="product-description-title">
            <span className={`${styles.detailSectionLabel} detail-section-label`} id="product-description-title">Descripción</span>
            <p className={`${styles.detailDescription} detail-description`}>{product.description}</p>
          </section>
          {product.pokemonCard && (
            <section className={`${styles.detailSpecsSection} detail-specs-section`} aria-labelledby="product-specs-title">
              <div className={`${styles.detailSpecsHeading} detail-specs-heading`}>
                <span id="product-specs-title">Especificaciones</span>
                <span>Detalles de la carta</span>
              </div>
              <dl className={`${styles.specs} specs`}>
                {product.pokemonCard.pokemonType && <div><dt>Tipo / atributo</dt><dd>{pokemonTypeLabels[product.pokemonCard.pokemonType]}</dd></div>}
                <div><dt>Set</dt><dd>{product.pokemonCard.setName}{product.pokemonCard.setCode ? ` · ${product.pokemonCard.setCode}` : ''}</dd></div>
                <div><dt>Número</dt><dd>{product.pokemonCard.cardNumber}</dd></div>
                <div><dt>Rareza</dt><dd>{product.pokemonCard.rarity}</dd></div>
                <div><dt>Condición</dt><dd>{product.pokemonCard.condition}</dd></div>
                <div><dt>Idioma</dt><dd>{product.pokemonCard.language}</dd></div>
                {product.pokemonCard.finish && <div><dt>Acabado</dt><dd>{product.pokemonCard.finish}</dd></div>}
                {product.pokemonCard.edition && <div><dt>Edición</dt><dd>{product.pokemonCard.edition}</dd></div>}
                {product.pokemonCard.gradingCompany && <div><dt>Grading</dt><dd>{product.pokemonCard.gradingCompany} {product.pokemonCard.grade}{product.pokemonCard.certificationNumber ? ` · Cert. ${product.pokemonCard.certificationNumber}` : ''}</dd></div>}
              </dl>
            </section>
          )}
          <div className={`${styles.detailPurchaseCard} detail-purchase-card`}>
            <div className={`${styles.detailPurchaseTop} detail-purchase-top`}><span>DISPONIBILIDAD</span><strong>{availabilityLabel}</strong></div>
            <div className={`${styles.detailStockTrack} detail-stock-track`} aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(8, product.available * 5))}%` }} /></div>
            <div className={`${styles.detailCta} detail-cta`}>
            <AddToCartButton product={product} />
              <p>{product.available > 0 ? 'Stock verificado al confirmar la compra.' : 'Este producto no está disponible en este momento.'}</p>
            </div>
          </div>
          <div className={`${styles.detailTrustRow} detail-trust-row`}><span><b>✓</b> Compra protegida</span><span><b>◇</b> Envíos a todo el país</span></div>
        </div>
      </div>
    </section>
  );
}

