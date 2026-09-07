import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CatalogBrowser } from '@/features/catalog/ui/catalog-browser';
export const metadata: Metadata = { title: 'Catálogo' };
export default function CatalogPage() { return <section className="page-container"><div className="section-heading"><p className="eyebrow">Explorá la colección</p><h1>Catálogo</h1><p>Encontrá cartas y productos sellados seleccionados.</p></div><Suspense fallback={<div className="page-loading">Cargando catálogo…</div>}><CatalogBrowser /></Suspense></section>; }
