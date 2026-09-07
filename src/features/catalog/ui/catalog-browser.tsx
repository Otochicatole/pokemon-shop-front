'use client';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listProducts } from '../infrastructure/api';
import { ProductCard } from '@/shared/ui/product-card';
import { Button } from '@/shared/ui/button';

export function CatalogBrowser() {
  const searchParams = useSearchParams(); const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') ?? ''); const [filters, setFilters] = useState(false);
  const [kind, setKind] = useState(searchParams.get('kind') ?? ''); const [condition, setCondition] = useState(searchParams.get('condition') ?? '');
  const products = useInfiniteQuery({ queryKey: ['products', query, kind, condition], initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => { const params = new URLSearchParams({ limit: '24' }); if (query) params.set('q', query); if (kind) params.set('kind', kind); if (condition) params.set('condition', condition); if (pageParam) params.set('cursor', pageParam); return listProducts(params); },
    getNextPageParam: (last) => last.meta.nextCursor });
  useEffect(() => { const timeout = setTimeout(() => { const params = new URLSearchParams(); if (query) params.set('q', query); if (kind) params.set('kind', kind); if (condition) params.set('condition', condition); router.replace(`/catalog${params.size ? `?${params}` : ''}`, { scroll: false }); }, 300); return () => clearTimeout(timeout); }, [query, kind, condition, router]);
  const items = products.data?.pages.flatMap((page) => page.data) ?? [];
  return <><div className="catalog-toolbar"><label className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, set o SKU" aria-label="Buscar productos" />{query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={16} /></button>}</label><Button variant="secondary" className="filter-toggle" onClick={() => setFilters(!filters)}><SlidersHorizontal size={17} /> Filtros</Button></div><div className={`filter-panel ${filters ? 'is-open' : ''}`}><label>Tipo<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Todos</option><option value="SINGLE_CARD">Cartas</option><option value="SEALED_PRODUCT">Sellado</option></select></label><label>Condición<select value={condition} onChange={(e) => setCondition(e.target.value)}><option value="">Todas</option><option value="NM">Near Mint</option><option value="EXCELLENT">Excellent</option><option value="GOOD">Good</option><option value="PLAYED">Played</option><option value="DAMAGED">Damaged</option></select></label><button className="text-button" onClick={() => { setKind(''); setCondition(''); }}>Limpiar filtros</button></div>{products.isLoading ? <div className="product-grid">{Array.from({ length: 8 }).map((_, i) => <div className="skeleton-card" key={i} />)}</div> : products.isError ? <div className="empty-state"><h2>No pudimos cargar el catálogo</h2><p>Revisá tu conexión e intentá nuevamente.</p><Button onClick={() => products.refetch()}>Reintentar</Button></div> : items.length === 0 ? <div className="empty-state"><span className="empty-icon">◌</span><h2>No encontramos productos</h2><p>Probá con otra búsqueda o quitá algún filtro.</p></div> : <><div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div>{products.hasNextPage && <div className="load-more"><Button variant="secondary" onClick={() => products.fetchNextPage()} disabled={products.isFetchingNextPage}>{products.isFetchingNextPage ? 'Cargando…' : 'Ver más productos'}</Button></div>}</>}</>;
}
