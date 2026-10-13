import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPokemonTcgPriceHistory } from '@/shared/pokemon-tcg/price-api';

const data = { cardId: '15618', prices: [{ sourceId: 'tcgplayer', source: 'TCGPlayer', currency: 'USD', variant: 'holofoil', amountMinor: '12345', recordedAt: '2026-10-07', observedAt: null }] };

describe('price history API client', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each(['admin', 'affiliate'] as const)('%s requests the history endpoint with cancellation and preserves original dates and prices', async (scope) => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data })));
    const controller = new AbortController();
    expect(await getPokemonTcgPriceHistory(scope, '15618', controller.signal)).toEqual(data);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/${scope}/pokemon-tcg/cards/15618/prices/history`), expect.objectContaining({ signal: controller.signal, credentials: 'include' }));
  });
});
