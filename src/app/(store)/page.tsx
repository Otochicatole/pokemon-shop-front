import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, Sparkles, Truck, Package, Layers3, Gem } from 'lucide-react';
import { CatalogProductCard, listProducts } from '@/features/catalog';
import { SectionHeading, TexturePanel } from '@/components';
import { HomeHero } from '@/features/home';
import { LoyaltyPromo } from '@/features/loyalty';
import { listPublicNews } from '@/features/news';
import { absoluteUrl, config, siteDescription } from '@/shared/config/env';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: { absolute: `${config.storeName} · Cartas Pokémon y coleccionables` },
  description: siteDescription,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${config.storeName} · Cartas Pokémon y coleccionables`,
    description: siteDescription,
    url: '/',
  },
};

const collections = [
  {
    href: '/catalog?kind=SINGLE_CARD',
    label: 'Cartas sueltas',
    eyebrow: 'Completá tu pokédex',
    icon: Layers3,
    toneClass: styles.collectionLinkYellow,
  },
  {
    href: '/catalog?kind=SEALED_PRODUCT',
    label: 'Sobres y cajas',
    eyebrow: 'Tentá a la suerte',
    icon: Package,
    toneClass: styles.collectionLinkRed,
  },
  {
    href: '/catalog?kind=ACCESSORY',
    label: 'Accesorios',
    eyebrow: 'Protegé tu equipo',
    icon: Gem,
    toneClass: styles.collectionLinkCyan,
  },
] as const;

export default async function Home() {
  const [products, news] = await Promise.all([
    listProducts(new URLSearchParams({ limit: '8' })).catch(() => ({ data: [], nextCursor: null })),
    listPublicNews().catch(() => ({ data: [] })),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': `${absoluteUrl()}/#organization`,
                name: config.storeName,
                url: absoluteUrl(),
                logo: absoluteUrl('/logo.svg'),
              },
              {
                '@type': 'WebSite',
                '@id': `${absoluteUrl()}/#website`,
                name: config.storeName,
                url: absoluteUrl(),
                description: siteDescription,
                publisher: { '@id': `${absoluteUrl()}/#organization` },
                inLanguage: 'es-AR',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${absoluteUrl('/catalog')}?q={search_term_string}`,
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          }),
        }}
      />
      <HomeHero news={news.data} />

      <section className={styles.trustStrip} aria-label="Beneficios de la tienda">
        <span>
          <ShieldCheck size={16} aria-hidden="true" /> Compra protegida
        </span>
        <span>
          <Sparkles size={16} aria-hidden="true" /> Piezas verificadas
        </span>
        <span>
          <Truck size={16} aria-hidden="true" /> Envíos a todo el país
        </span>
      </section>

      <section className={styles.collectionLinks} aria-label="Explorar colecciones">
        {collections.map(({ href, label, eyebrow, icon: Icon, toneClass }) => (
          <Link className={`${styles.collectionLink} ${toneClass}`} href={href} key={label}>
            <span className={styles.collectionIcon} aria-hidden="true">
              <Icon size={22} />
            </span>
            <span className={styles.collectionCopy}>
              <small>{eyebrow}</small>
              <strong>{label}</strong>
            </span>
            <ArrowUpRight size={17} aria-hidden="true" className={styles.collectionArrow} />
          </Link>
        ))}
      </section>

      <section className={styles.homeSection}>
        <SectionHeading
          level="h2"
          eyebrow="Inventario en vivo"
          title="Cartas destacadas"
          description="Stock real, precios claros y piezas listas para tu próxima colección."
          action={
            <Link className={styles.textButton} href="/catalog">
              Catálogo completo <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          }
          className={styles.sectionHeading}
        />
        {products.data.length ? (
          <div className={styles.productGrid}>
            {products.data.map((product) => (
              <CatalogProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyHome}>
            <span className={styles.emptyIcon} aria-hidden="true">
              ◈
            </span>
            <p>El catálogo se está preparando.</p>
            <Link href="/catalog" className={styles.textButton}>
              Explorar la tienda <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <section className={styles.exploreSection}>
        <TexturePanel className={styles.explorePanel}>
          <div>
            <p className="eyebrow">Mapa de la aventura // {config.storeName}</p>
            <h2>Explorá por categoría</h2>
            <p>Cada zona esconde una colección diferente.</p>
          </div>
          <Link className="button button-secondary" href="/catalog">
            Ver todas las piezas <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </TexturePanel>
      </section>

      <LoyaltyPromo />
    </>
  );
}
