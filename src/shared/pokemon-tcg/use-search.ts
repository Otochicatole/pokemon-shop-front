'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PokemonTcgSearchResult } from './contracts';

type SearchCards = (query: string, page: number, signal?: AbortSignal) => Promise<PokemonTcgSearchResult>;

export function usePokemonTcgSearch({ open, scope, searchCards }: { open: boolean; scope: 'admin' | 'affiliate'; searchCards: SearchCards }) {
  const [input, setInput] = useState('');
  const [{ query, page }, setSearch] = useState({ query: '', page: 1 });
  // Closing the dialog detaches the active query, allowing React Query to abort it.
  const activeQuery = open ? query : '';
  const activePage = open ? page : 1;
  const results = useQuery({
    queryKey: [scope, 'pokemon-tcg', 'cards', activeQuery, activePage],
    queryFn: ({ signal }) => searchCards(activeQuery, activePage, signal),
    enabled: open && activeQuery.length >= 2,
    staleTime: 60_000,
    retry: false,
  });

  function reset(prefill = '') {
    setInput(prefill);
    setSearch({ query: '', page: 1 });
  }

  function search() {
    const nextQuery = input.trim();
    if (!open || nextQuery.length < 2) return;
    if (nextQuery === query && page === 1) void results.refetch();
    else setSearch({ query: nextQuery, page: 1 });
  }

  function changePage(nextPage: number) {
    if (!open || query.length < 2 || results.isFetching || !Number.isSafeInteger(nextPage) || nextPage < 1 || nextPage === page) return;
    const totalPages = results.data?.meta.totalPages;
    if (totalPages !== undefined && nextPage > Math.max(1, totalPages)) return;
    // An unsuccessful page can still navigate back, but cannot advance blindly.
    if (totalPages === undefined && nextPage > page) return;
    setSearch({ query, page: nextPage });
  }

  function retry() {
    if (open && query.length >= 2) void results.refetch();
  }

  return { input, setInput, query, page, results, reset, search, changePage, retry };
}
