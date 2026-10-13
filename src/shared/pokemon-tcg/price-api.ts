import { apiFetch } from '@/shared/api/client';
import { adminFetch } from '@/shared/admin/client';
import { pokemonTcgPriceHistoryEnvelopeSchema } from './contracts';

export async function getPokemonTcgPriceHistory(scope: 'admin' | 'affiliate', cardId: string, signal?: AbortSignal) {
  const fetcher = scope === 'admin' ? adminFetch : apiFetch;
  const response = await fetcher(`/${scope}/pokemon-tcg/cards/${encodeURIComponent(cardId)}/prices/history`, { signal }, pokemonTcgPriceHistoryEnvelopeSchema);
  return response.data;
}
