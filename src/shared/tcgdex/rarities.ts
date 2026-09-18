'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export function raritySelectOptions(rarities: readonly string[], current?: string | null) {
  const values = [...rarities];
  const currentValue = current?.trim();
  if (currentValue && !values.includes(currentValue)) values.unshift(currentValue);
  return values;
}

export function useTcgdexRarities(fetcher: () => Promise<string[]>, enabled = true) {
  const query = useQuery({
    queryKey: ['tcgdex', 'rarities'],
    queryFn: fetcher,
    enabled,
    staleTime: 60 * 60 * 1000,
  });

  const rarities = useMemo(() => query.data ?? [], [query.data]);
  return { ...query, rarities };
}
