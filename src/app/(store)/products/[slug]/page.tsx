import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, pokemonTypeLabels } from '@/features/catalog';
import { AddToCartButton } from '@/features/cart/ui/add-to-cart-button';
import { formatMoney } from '@/shared/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  return { title: product?.name ?? 'Producto', description: product?.description };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();
  const image = product.images[0];
  const kindLabel = product.kind === 'SINGLE_CARD' ? 'Carta individual' : product.kind === 'SEALED_PRODUCT' ? 'Producto sellado' : 'Accesorio';
  const availabilityLabel = product.available > 0 ? `${product.available} unidades disponibles` : 'Sin stock disponible';

  return (
    <section className="page-container product-detail">
      <Link href="/catalog" className="back-link">← Volver al catálogo</Link>
      <div className="detail-grid">
        <div className="detail-gallery">
          <div className="detail-gallery-header"><span>PIEZA // {product.sku}</span><span>{product.images.length ? `${product.images.length} ${product.images.length === 1 ? 'vista' : 'vistas'}` : 'Vista única'}</span></div>
          <figure className="detail-main-image">
            <span className="detail-image-corner detail-image-corner-tl" aria-hidden="true" />
            <span className="detail-image-corner detail-image-corner-br" aria-hidden="true" />
            {image ? <Image src={image.url} alt={image.altText || product.name} fill priority sizes="(max-width: 900px) 100vw, 56vw" /> : <div className="image-placeholder large"><span>◈</span></div>}
            <figcaption>IMAGEN DE CATÁLOGO · STOCK VERIFICADO</figcaption>
          </figure>
          {product.images.length > 1 && <div className="detail-thumbnails" aria-label="Vistas del producto">{product.images.map((item, index) => <div className={`detail-thumbnail ${index === 0 ? 'is-active' : ''}`} key={item.id}><Image src={item.url} alt={item.altText || `${product.name}, vista ${index + 1}`} fill sizes="80px" /></div>)}</div>}
        </div>
        <div className="detail-copy">
          <div className="detail-kicker"><span className="pixel-badge pixel-badge-yellow">{kindLabel}</span><span className="detail-code">SKU {product.sku}</span></div>
          <h1>{product.name}</h1>
          <div className="detail-price-row"><p className="detail-price">{formatMoney(product.price)}</p><span className={product.available > 0 ? 'detail-stock-chip is-available' : 'detail-stock-chip is-empty'}>{product.available > 0 ? 'Disponible' : 'Agotado'}</span></div>
          <p className="detail-description">{product.description}</p>
          {product.pokemonCard && (
            <dl className="specs">
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
          )}
          <div className="detail-purchase-card">
            <div className="detail-purchase-top"><span>DISPONIBILIDAD</span><strong>{availabilityLabel}</strong></div>
            <div className="detail-stock-track" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(8, product.available * 5))}%` }} /></div>
            <div className="detail-cta">
            <AddToCartButton product={product} />
              <p>{product.available > 0 ? 'Stock verificado al confirmar la compra.' : 'Este producto no está disponible en este momento.'}</p>
            </div>
          </div>
          <div className="detail-trust-row"><span><b>✓</b> Compra protegida</span><span><b>◇</b> Envíos a todo el país</span></div>
        </div>
      </div>
    </section>
  );
}
