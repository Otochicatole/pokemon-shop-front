'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export type PokemonTcgSetOption = { id: string; name: string };

export function setSelectOptions(sets: readonly PokemonTcgSetOption[], currentName?: string | null, currentCode?: string | null) {
  const values = [...sets];
  const name = currentName?.trim();
  const code = currentCode?.trim();
  if (name && code) {
    const currentIndex = values.findIndex((set) => set.id === code);
    // Card details can contain a newer name than the set catalog's placeholder.
    if (currentIndex >= 0) values[currentIndex] = { id: code, name };
    else values.unshift({ id: code, name });
  } else if (name && !values.some((set) => set.name === name)) {
    values.unshift({ id: name, name });
  }
  return values;
}

export function selectedSetId(sets: readonly PokemonTcgSetOption[], currentName?: string | null, currentCode?: string | null) {
  const code = currentCode?.trim();
  if (code) {
    return sets.find((set) => set.id === code)?.id ?? '';
  }
  const name = currentName?.trim();
  if (name) {
    const byName = sets.find((set) => set.name === name);
    if (byName) return byName.id;
  }
  return '';
}

export function usePokemonTcgSets(fetcher: () => Promise<PokemonTcgSetOption[]>, enabled = true) {
  const query = useQuery({
    queryKey: ['pokemon-tcg', 'sets'],
    queryFn: fetcher,
    enabled,
    staleTime: 60 * 60 * 1000,
  });

  const sets = useMemo(() => query.data ?? [], [query.data]);
  return { ...query, sets };
}
