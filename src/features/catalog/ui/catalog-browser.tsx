'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/button';
import { Drawer } from '@/components/overlay';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback';
import { activeCatalogFilterCount, buildCatalogApiParams, catalogFiltersToSearchParams, hasCatalogFilters, parseCatalogFilters, toggleCatalogFilter } from '../application/catalog-filter-codec';
import { emptyCatalogFilters, sortLabels, type CatalogArrayFilterKey, type CatalogFilterState } from '../domain/catalog-filters';
import { getCatalogFilters, listProducts } from '../infrastructure/api';
import { CatalogActiveFilters } from './catalog-active-filters';
import { CatalogFilterPanel } from './catalog-filter-panel';
import { CatalogProductCard } from './catalog-product-card';
import styles from './catalog-browser.module.css';

function CatalogSearch({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    const q = draft.trim().slice(0, 100);
    if (q === value) return;
    const timeout = window.setTimeout(() => onCommit(q), 350);
    return () => window.clearTimeout(timeout);
  }, [draft, onCommit, value]);

  return (
    <label className={`${styles.searchBox} search-box`}>
      <Search size={18} aria-hidden="true" />
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Buscar nombre, Pokémon, set, número o SKU"
        aria-label="Buscar productos"
      />
      {draft && <button type="button" onClick={() => setDraft('')} aria-label="Limpiar búsqueda"><X size={16} /></button>}
    </label>
  );
}

export function CatalogBrowser() {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const initialFilters = useMemo(() => parseCatalogFilters(new URLSearchParams(searchParamsKey)), [searchParamsKey]);
  return <CatalogBrowserController key={searchParamsKey} initialFilters={initialFilters} />;
}

type FilterUpdate = CatalogFilterState | ((current: CatalogFilterState) => CatalogFilterState);

function CatalogBrowserController({ initialFilters }: { initialFilters: CatalogFilterState }) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const filtersRef = useRef(initialFilters);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const replaceFilters = useCallback((update: FilterUpdate) => {
    const next = typeof update === 'function' ? update(filtersRef.current) : update;
    filtersRef.current = next;
    setFilters(next);
    const params = catalogFiltersToSearchParams(next);
    router.replace(`/catalog${params.size > 0 ? `?${params.toString()}` : ''}`, { scroll: false });
  }, [router]);

  const commitSearch = useCallback((q: string) => replaceFilters((current) => ({ ...current, q })), [replaceFilters]);
  const closeFilterDrawer = useCallback(() => setFilterDrawerOpen(false), []);

  const facetsQuery = useQuery({
    queryKey: ['catalog-filters'],
    queryFn: getCatalogFilters,
    staleTime: 5 * 60 * 1000,
  });
  const productQueryKey = buildCatalogApiParams(filters).toString();
  const products = useInfiniteQuery({
    queryKey: ['products', productQueryKey],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => listProducts(buildCatalogApiParams(filters, pageParam)),
    getNextPageParam: (last) => last.meta.nextCursor,
  });

  const items = products.data?.pages.flatMap((page) => page.data) ?? [];
  const activeCount = activeCatalogFilterCount(filters);
  const changeFilters = useCallback((next: CatalogFilterState) => replaceFilters(next), [replaceFilters]);
  const toggleFilter = useCallback((key: CatalogArrayFilterKey, value: string) => {
    replaceFilters((current) => toggleCatalogFilter(current, key, value));
  }, [replaceFilters]);
  const clearFilters = useCallback(() => replaceFilters(emptyCatalogFilters), [replaceFilters]);

  const filterPanelProps = {
    filters,
    facets: facetsQuery.data,
    onToggle: toggleFilter,
    onChange: changeFilters,
    onClear: clearFilters,
  };

  return (
    <>
      <div className={`${styles.catalogToolbar} catalog-toolbar`}>
        <CatalogSearch key={filters.q} value={filters.q} onCommit={commitSearch} />
        <label className={`${styles.catalogSort} catalog-sort`}>
          <span>Ordenar</span>
          <span className={styles.catalogSortControl}>
            <select value={filters.sort} onChange={(event) => changeFilters({ ...filters, sort: event.target.value as CatalogFilterState['sort'] })}>
              {Object.entries(sortLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            <ChevronDown size={16} aria-hidden="true" className={styles.catalogSortIcon} />
          </span>
        </label>
        <Button
          type="button"
          variant="secondary"
          className={`${styles.catalogFilterToggle} catalog-filter-toggle`}
          aria-expanded={filterDrawerOpen}
          aria-controls="catalog-filter-drawer"
          onClick={() => setFilterDrawerOpen(true)}
        >
          <SlidersHorizontal size={17} /> Filtros{activeCount > 0 && <span>{activeCount}</span>}
        </Button>
      </div>

      <CatalogActiveFilters filters={filters} facets={facetsQuery.data} onChange={changeFilters} onClear={clearFilters} />

      <div className={`${styles.catalogLayout} catalog-layout`}>
        <aside className={`${styles.catalogFilterSidebar} catalog-filter-sidebar`} aria-label="Filtros del catálogo">
          <CatalogFilterPanel {...filterPanelProps} />
          {facetsQuery.isError && <p className={`${styles.catalogFacetWarning} catalog-facet-warning`}>Los conteos no están disponibles, pero podés seguir filtrando.</p>}
        </aside>

        <div className={`${styles.catalogResults} catalog-results`}>
          <div className={`${styles.catalogResultsStatus} catalog-results-status`} role="status" aria-live="polite">
            <span>{products.isLoading ? 'Buscando piezas…' : `${items.length}${products.hasNextPage ? '+' : ''} ${items.length === 1 ? 'producto' : 'productos'}`}</span>
            {products.isFetching && !products.isLoading && <small>Actualizando…</small>}
          </div>

          {products.isLoading ? (
            <LoadingSkeleton count={8} className={styles.catalogSkeleton} />
          ) : products.isError ? (
            <div className={styles.catalogStatePanel}>
              <ErrorState title="No pudimos cargar el catálogo" description="Revisá tu conexión e intentá nuevamente.">
                <Button type="button" onClick={() => products.refetch()}>Reintentar</Button>
              </ErrorState>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.catalogStatePanel}>
              <EmptyState title="No encontramos productos" description="Probá con otra búsqueda o quitá algún filtro." icon="◈">
                {hasCatalogFilters(filters) && <Button type="button" variant="secondary" onClick={clearFilters}>Limpiar filtros</Button>}
              </EmptyState>
            </div>
          ) : (
            <>
              <div className={`${styles.productGrid} product-grid`}>{items.map((product) => <CatalogProductCard key={product.id} product={product} />)}</div>
              {products.hasNextPage && (
                <div className={`${styles.loadMore} load-more`}>
                  <Button type="button" variant="secondary" onClick={() => products.fetchNextPage()} disabled={products.isFetchingNextPage}>
                    {products.isFetchingNextPage ? 'Cargando…' : 'Ver más productos'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Drawer open={filterDrawerOpen} title="Filtrar catálogo" onClose={closeFilterDrawer} className={`${styles.catalogFilterDrawer} catalog-filter-drawer`}>
        <div id="catalog-filter-drawer"><CatalogFilterPanel {...filterPanelProps} /></div>
        <Button type="button" className={`${styles.catalogFilterDone} catalog-filter-done`} onClick={closeFilterDrawer}>Ver productos</Button>
      </Drawer>
    </>
  );
}
