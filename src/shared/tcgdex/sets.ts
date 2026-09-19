'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export type TcgDexSetOption = { id: string; name: string };

export function setSelectOptions(sets: readonly TcgDexSetOption[], currentName?: string | null, currentCode?: string | null) {
  const values = [...sets];
  const name = currentName?.trim();
  const code = currentCode?.trim();
  if (name && !values.some((set) => set.name === name || set.id === code)) {
    values.unshift({ id: code || name, name });
  }
  return values;
}

export function selectedSetId(sets: readonly TcgDexSetOption[], currentName?: string | null, currentCode?: string | null) {
  const code = currentCode?.trim();
  if (code) {
    const byCode = sets.find((set) => set.id === code);
    if (byCode) return byCode.id;
  }
  const name = currentName?.trim();
  if (name) {
    const byName = sets.find((set) => set.name === name);
    if (byName) return byName.id;
  }
  return '';
}

export function useTcgdexSets(fetcher: () => Promise<TcgDexSetOption[]>, enabled = true) {
  const query = useQuery({
    queryKey: ['tcgdex', 'sets'],
    queryFn: fetcher,
    enabled,
    staleTime: 60 * 60 * 1000,
  });

  const sets = useMemo(() => query.data ?? [], [query.data]);
  return { ...query, sets };
}
