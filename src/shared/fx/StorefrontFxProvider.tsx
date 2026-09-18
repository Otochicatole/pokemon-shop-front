'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/shared/api/client';
import type { Money } from '@/shared/api/contracts';
import { formatArsFromUsd, storefrontFxQuoteSchema, toArsMoney, type StorefrontFxQuote } from './money';

type StorefrontFxContextValue = {
  quote: StorefrontFxQuote | null;
  rateMicros: string | null;
  isLoading: boolean;
  isError: boolean;
  formatMoney: (usd: Money | undefined) => string;
  toArs: (usd: Money | undefined) => ReturnType<typeof toArsMoney>;
};

const StorefrontFxContext = createContext<StorefrontFxContextValue | null>(null);

const fxEnvelopeSchema = z.object({
  data: storefrontFxQuoteSchema,
  meta: z.record(z.string(), z.unknown()).optional(),
});

async function fetchUsdArsQuote(): Promise<StorefrontFxQuote> {
  const response = await apiFetch('/fx/usd-ars', { cache: 'no-store' }, fxEnvelopeSchema);
  return response.data;
}

export function StorefrontFxProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ['fx', 'usd-ars'],
    queryFn: fetchUsdArsQuote,
    staleTime: 60_000,
    refetchInterval: (current) => {
      const expiresAt = current.state.data?.expiresAt;
      if (!expiresAt) return 60_000;
      const ms = new Date(expiresAt).getTime() - Date.now() - 5_000;
      return Math.max(15_000, Math.min(ms, 5 * 60_000));
    },
  });

  const value = useMemo<StorefrontFxContextValue>(() => {
    const quote = query.data ?? null;
    const rateMicros = quote?.rateMicros ?? null;
    return {
      quote,
      rateMicros,
      isLoading: query.isLoading,
      isError: query.isError,
      formatMoney: (usd) => formatArsFromUsd(usd, rateMicros),
      toArs: (usd) => toArsMoney(usd, rateMicros),
    };
  }, [query.data, query.isError, query.isLoading]);

  return <StorefrontFxContext.Provider value={value}>{children}</StorefrontFxContext.Provider>;
}

export function useStorefrontFx() {
  const value = useContext(StorefrontFxContext);
  if (!value) {
    return {
      quote: null,
      rateMicros: null,
      isLoading: false,
      isError: false,
      formatMoney: (usd: Money | undefined) => (usd ? formatArsFromUsd(usd, null) : '—'),
      toArs: (usd: Money | undefined) => toArsMoney(usd, null),
    } satisfies StorefrontFxContextValue;
  }
  return value;
}
