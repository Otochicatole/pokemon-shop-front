import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, Package, Store, Truck } from 'lucide-react';
import type { Product } from '@/shared/api/contracts';
import { pokemonTypeLabels } from '@/features/catalog';
import { conditionLabels } from '@/features/catalog/domain/catalog-filters';
import { AddToCartButton } from '@/features/cart/ui/add-to-cart-button';
import { ProductImageGallery } from './product-image-gallery';
import { ProductPurchasePrice } from './product-purchase-price';
import styles from './page.module.css';

type Detail = { label: string; value: string | null | undefined };
const dataLabels = new Set(['Código de set', 'Número de carta', 'Número de certificación', 'SKU', 'Grado']);

function DetailList({ items }: { items: Detail[] }) {
  return <dl className={styles.specs}>{items.map(({ label, value }) => (
    <div key={label}><dt>{label}</dt><dd className={`${!value?.trim() ? styles.missing : ''} ${dataLabels.has(label) ? 'product-data' : ''}`.trim()}>{value?.trim() || 'No informado'}</dd></div>
  ))}</dl>;
}

export function ProductDetails({ product }: { product: Product }) {
  const card = product.pokemonCard;
  const kindLabel = product.kind === 'SINGLE_CARD' ? 'Carta individual' : product.kind === 'SEALED_PRODUCT' ? 'Producto sellado' : 'Accesorio';
  const inStock = product.available > 0;
  const availability = inStock ? `${product.available} ${product.available === 1 ? 'unidad disponible' : 'unidades disponibles'}` : 'Sin stock disponible';
  const updated = product.updatedAt ? new Date(product.updatedAt) : null;
  const updatedDate = updated && Number.isFinite(updated.getTime()) ? updated : null;
  const collectionCode = card?.setCode?.trim();
  const collectionName = card?.setName.trim();
  const collectionLink = collectionCode ? `/catalog?setCode=${encodeURIComponent(collectionCode)}` : collectionName ? `/catalog?setName=${encodeURIComponent(collectionName)}` : null;

  return (
    <div className={`${styles.productDetail} page-container product-detail`}>
      <nav className={styles.breadcrumb} aria-label="Ruta del producto">
        <Link href="/catalog"><ArrowLeft size={16} aria-hidden="true" />Catálogo</Link>
        <span aria-hidden="true">/</span><span aria-current="page">{product.name}</span>
      </nav>
      <div className={styles.overview}>
        <ProductImageGallery images={product.images} productName={product.name} sku={product.sku} />
        <div className={styles.summary}>
          <header className={styles.identity}>
            <h1>{product.name}</h1>
            <p className={styles.productKind}>{kindLabel}{card?.pokemonType && <> <span aria-hidden="true">·</span> {pokemonTypeLabels[card.pokemonType]}</>}</p>
            {card && <p className={styles.collection}>{collectionName || 'Colección no informada'}{card.cardNumber.trim() && <> <span aria-hidden="true">/</span> <span className="product-data">N.º {card.cardNumber.trim()}</span></>}</p>}
          </header>
          {card && <dl className={styles.highlights}>
            <div><dt>Rareza</dt><dd>{card.rarity.trim() || 'No informada'}</dd></div>
            <div><dt>Condición</dt><dd>{conditionLabels[card.condition]}</dd></div>
            <div><dt>Idioma</dt><dd>{card.language.trim() || 'No informado'}</dd></div>
          </dl>}
          <div className={styles.purchase}>
            <ProductPurchasePrice price={product.price} />
            <p className={`${styles.availability} ${!inStock ? styles.unavailable : ''}`}>
              {inStock ? <Check size={17} aria-hidden="true" /> : <Package size={17} aria-hidden="true" />}<strong className="product-data">{availability}</strong>
            </p>
            <div className={styles.purchaseAction}><AddToCartButton product={product} /></div>
            <p className={styles.stockNote}>{inStock ? 'La disponibilidad se verifica al confirmar la compra.' : 'Podés explorar otras cartas disponibles en el catálogo.'}</p>
            {!inStock && <Link href="/catalog" className={styles.textLink}>Ver productos disponibles<ArrowUpRight size={15} aria-hidden="true" /></Link>}
          </div>
          <div className={styles.seller}><Store size={20} aria-hidden="true" /><div><span>Vendido por</span><strong>{product.seller.name}</strong><small>{product.seller.type === 'AFFILIATE' ? 'Vendedor afiliado' : 'Tienda'}</small></div></div>
          <div className={styles.delivery}><Truck size={20} aria-hidden="true" /><p><strong>Entrega y pago</strong>Consultá las opciones de envío, retiro y pago al finalizar la compra. Dependen del vendedor y de tu ubicación.</p></div>
          <a href="#product-information" className={styles.detailsLink}>Ver información completa<ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
      </div>
      <section id="product-information" className={styles.information} aria-labelledby="product-information-title">
        <div className={styles.sectionHeading}><h2 id="product-information-title">Información del producto</h2><span>SKU <span className="product-data">{product.sku}</span></span></div>
        <div className={styles.informationGrid}>
          <div className={styles.technical}>
            {card ? <>
              <section aria-labelledby="card-details-title"><h3 id="card-details-title">Detalles de la carta</h3><DetailList items={[
                { label: 'Colección / set', value: card.setName }, { label: 'Código de set', value: card.setCode },
                { label: 'Número de carta', value: card.cardNumber }, { label: 'Rareza', value: card.rarity },
                { label: 'Tipo / atributo', value: card.pokemonType ? pokemonTypeLabels[card.pokemonType] : null }, { label: 'Idioma', value: card.language },
              ]} /></section>
              <section aria-labelledby="card-condition-title"><h3 id="card-condition-title">Estado y edición</h3><DetailList items={[
                { label: 'Condición', value: `${conditionLabels[card.condition]} (${card.condition})` },
                { label: 'Acabado / foil', value: card.finish }, { label: 'Edición', value: card.edition },
              ]} /></section>
              <section aria-labelledby="card-grading-title"><h3 id="card-grading-title">Certificación y grading</h3>
                {!card.gradingCompany && !card.grade && !card.certificationNumber && <p className={styles.sectionNote}>El vendedor no informó datos de certificación para esta carta.</p>}
                <DetailList items={[
                  { label: 'Empresa de grading', value: card.gradingCompany }, { label: 'Grado', value: card.grade }, { label: 'Número de certificación', value: card.certificationNumber },
                ]} />
              </section>
            </> : <section aria-labelledby="product-details-title"><h3 id="product-details-title">Detalles</h3><DetailList items={[{ label: 'Tipo de producto', value: kindLabel }, { label: 'SKU', value: product.sku }]} /></section>}
          </div>
          <aside className={styles.additional} aria-label="Descripción y publicación">
            <section aria-labelledby="product-description-title"><h3 id="product-description-title">Descripción</h3><p className={styles.description}>{product.description?.trim() || 'El vendedor todavía no agregó una descripción para este producto.'}</p></section>
            <section aria-labelledby="listing-details-title"><h3 id="listing-details-title">Datos de la publicación</h3><DetailList items={[
              { label: 'Tipo de producto', value: kindLabel }, { label: 'SKU', value: product.sku },
              { label: 'Vendedor', value: product.seller.name }, { label: 'Tipo de vendedor', value: product.seller.type === 'AFFILIATE' ? 'Vendedor afiliado' : 'Tienda' },
              { label: 'Disponibilidad', value: availability }, { label: 'Modalidad de venta', value: product.stockMode === 'UNIQUE' ? 'Ejemplar individual' : 'Por cantidad' },
            ]} />
              {updatedDate && <p className={styles.updated}>Publicación actualizada el <time dateTime={updatedDate.toISOString()}>{updatedDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })}</time>.</p>}
            </section>
            {collectionLink && <Link className={styles.collectionLink} href={collectionLink}>Explorar esta colección<ArrowUpRight size={18} aria-hidden="true" /></Link>}
          </aside>
        </div>
      </section>
    </div>
  );
}
