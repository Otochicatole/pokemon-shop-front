import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchPokemonTcgCards } from '@/features/product-management/infrastructure/api';
import { searchAffiliatePokemonTcgCards } from '@/features/affiliate/infrastructure/api';
import { pokemonTcgSearchEnvelopeSchema } from '@/shared/pokemon-tcg/contracts';

const envelope = {
  data: [{ id: '248', name: 'Rayquaza', localId: '4', setCode: 'BS', imageUrl: null }],
  meta: { page: 4, limit: 20, total: 61, totalPages: 4 },
};

describe('Pokémon TCG paginated API clients', () => {
  afterEach(() => vi.restoreAllMocks());

  for (const [scope, search] of [['admin', searchPokemonTcgCards], ['affiliate', searchAffiliatePokemonTcgCards]] as const) {
    it(`${scope}: forwards pagination, encoded search and cancellation, retaining all metadata`, async () => {
      const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(envelope)));
      const controller = new AbortController();
      expect(await search('M Rayquaza & EX', 4, controller.signal)).toEqual(envelope);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/${scope}/pokemon-tcg/cards?q=M%20Rayquaza%20%26%20EX&page=4`),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it(`${scope}: requests page one by default and accepts an empty search result`, async () => {
      const empty = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(empty)));
      expect(await search('Missing')).toEqual(empty);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('&page=1'), expect.anything());
    });
  }

  it('rejects missing or malformed pagination instead of silently truncating the list', () => {
    expect(pokemonTcgSearchEnvelopeSchema.safeParse({ data: envelope.data }).success).toBe(false);
    for (const meta of [{ ...envelope.meta, page: 0 }, { ...envelope.meta, limit: 0 }, { ...envelope.meta, total: -1 }, { ...envelope.meta, totalPages: 1.5 }]) {
      expect(pokemonTcgSearchEnvelopeSchema.safeParse({ ...envelope, meta }).success).toBe(false);
    }
  });
});
