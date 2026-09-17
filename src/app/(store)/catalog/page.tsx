import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Gem, Layers3, Package } from 'lucide-react';
import { PageHeading } from '@/components';
import { CatalogBrowser } from '@/features/catalog';
import { config } from '@/shared/config/env';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Catálogo',
  description:
    'Explorá cartas Pokémon sueltas, productos sellados y accesorios con stock real. Filtrá por tipo, set, rareza y más.',
  alternates: { canonical: '/catalog' },
  openGraph: {
    title: `Catálogo · ${config.storeName}`,
    description: 'Cartas, sellados y accesorios con stock real.',
    url: '/catalog',
  },
};

const shortcuts = [
  { href: '/catalog?kind=SINGLE_CARD', label: 'Cartas sueltas', icon: Layers3, tone: styles.shortcutYellow },
  { href: '/catalog?kind=SEALED_PRODUCT', label: 'Sobres y cajas', icon: Package, tone: styles.shortcutRed },
  { href: '/catalog?kind=ACCESSORY', label: 'Accesorios', icon: Gem, tone: styles.shortcutCyan },
] as const;

export default function CatalogPage() {
  return (
    <section className={`${styles.pageContainer} page-container`}>
      <div className={styles.pageIntro}>
        <PageHeading
          className={styles.pageHeading}
          eyebrow="Explorá la colección"
          title="Catálogo"
          description="Cartas, sellados y accesorios con stock real. Filtrá, ordená y encontrá tu próxima pieza."
        />
        <nav className={styles.shortcuts} aria-label="Atajos del catálogo">
          {shortcuts.map(({ href, label, icon: Icon, tone }) => (
            <Link key={href} href={href} className={`${styles.shortcut} ${tone}`}>
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <Suspense fallback={<div className={`${styles.pageLoading} page-loading`}>Cargando catálogo…</div>}>
        <CatalogBrowser />
      </Suspense>
    </section>
  );
}
