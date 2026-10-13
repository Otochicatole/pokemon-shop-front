import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { usePokemonTcgSearch } from '@/shared/pokemon-tcg/use-search';
import type { PokemonTcgSearchResult } from '@/shared/pokemon-tcg/contracts';

function response(query: string, page = 1): PokemonTcgSearchResult {
  return {
    data: [{ id: `${query}-${page}`, name: `${query} ${page}`, localId: String(page), setCode: 'BS', imageUrl: null }],
    meta: { page, limit: 20, total: 61, totalPages: 4 },
  };
}

type SearchCards = Parameters<typeof usePokemonTcgSearch>[0]['searchCards'];

function setup(searchCards: SearchCards = vi.fn(async (query, page) => response(query, page))) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(({ open }) => usePokemonTcgSearch({ open, scope: 'admin', searchCards }), { wrapper, initialProps: { open: true } });
  return { ...hook, searchCards };
}

async function submit(hook: ReturnType<typeof setup>, query: string) {
  act(() => hook.result.current.setInput(query));
  act(() => hook.result.current.search());
  await waitFor(() => expect(hook.result.current.results.isSuccess).toBe(true));
}

describe('paginated Pokémon TCG search', () => {
  it('loads the requested page using the submitted name, including the last page', async () => {
    const hook = setup();
    await submit(hook, '  Rayquaza  ');
    act(() => hook.result.current.setInput('Pikachu'));
    act(() => hook.result.current.changePage(4));
    await waitFor(() => expect(hook.result.current.results.data?.meta.page).toBe(4));
    expect(hook.result.current.query).toBe('Rayquaza');
    expect(hook.result.current.results.data?.data[0].id).toBe('Rayquaza-4');
    expect(hook.searchCards).toHaveBeenLastCalledWith('Rayquaza', 4, expect.any(AbortSignal));
    for (const page of [0, -1, 1.5, 5, Number.POSITIVE_INFINITY, 4]) act(() => hook.result.current.changePage(page));
    expect(hook.result.current.page).toBe(4);
    expect(hook.searchCards).toHaveBeenCalledTimes(2);
  });

  it('resets a new search atomically to page one and reuses cached pages', async () => {
    const hook = setup();
    await submit(hook, 'Rayquaza');
    act(() => hook.result.current.changePage(2));
    await waitFor(() => expect(hook.result.current.results.data?.meta.page).toBe(2));
    act(() => hook.result.current.changePage(1));
    expect(hook.result.current.results.data?.data[0].id).toBe('Rayquaza-1');
    expect(hook.searchCards).toHaveBeenCalledTimes(2);
    act(() => hook.result.current.changePage(2));
    await submit(hook, 'Pikachu');
    expect(hook.result.current.page).toBe(1);
    expect(hook.searchCards).toHaveBeenLastCalledWith('Pikachu', 1, expect.any(AbortSignal));
    expect(hook.searchCards).toHaveBeenCalledTimes(3);
  });

  it('resubmitting the same name from a later page returns to page one, then refreshes on resubmit', async () => {
    const hook = setup();
    await submit(hook, 'Rayquaza');
    act(() => hook.result.current.changePage(2));
    await waitFor(() => expect(hook.result.current.results.data?.meta.page).toBe(2));
    act(() => hook.result.current.search());
    expect(hook.result.current.page).toBe(1);
    expect(hook.result.current.results.data?.meta.page).toBe(1);
    expect(hook.searchCards).toHaveBeenCalledTimes(2);
    act(() => hook.result.current.search());
    await waitFor(() => expect(hook.searchCards).toHaveBeenCalledTimes(3));
    expect(hook.searchCards).toHaveBeenLastCalledWith('Rayquaza', 1, expect.any(AbortSignal));
  });

  it('retries a failed page without switching to edited input and can navigate back after failure', async () => {
    const searchCards = vi.fn<SearchCards>()
      .mockResolvedValueOnce(response('Rayquaza'))
      .mockRejectedValueOnce(new Error('Servicio no disponible'))
      .mockResolvedValueOnce(response('Rayquaza', 2))
      .mockRejectedValueOnce(new Error('Servicio no disponible'));
    const hook = setup(searchCards);
    await submit(hook, 'Rayquaza');
    act(() => hook.result.current.changePage(2));
    await waitFor(() => expect(hook.result.current.results.isError).toBe(true));
    act(() => hook.result.current.changePage(3));
    expect(hook.result.current.page).toBe(2);
    act(() => hook.result.current.setInput('Pikachu'));
    act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.results.data?.meta.page).toBe(2));
    expect(searchCards).toHaveBeenLastCalledWith('Rayquaza', 2, expect.any(AbortSignal));
    act(() => hook.result.current.changePage(3));
    await waitFor(() => expect(hook.result.current.results.isError).toBe(true));
    act(() => hook.result.current.changePage(2));
    expect(hook.result.current.results.data?.meta.page).toBe(2);
    expect(searchCards).toHaveBeenCalledTimes(4);
  });

  it('aborts superseded requests and ignores an old search resolving out of order', async () => {
    let resolveOld!: (value: PokemonTcgSearchResult) => void;
    const oldResponse = new Promise<PokemonTcgSearchResult>((resolve) => { resolveOld = resolve; });
    const searchCards = vi.fn<SearchCards>().mockReturnValueOnce(oldResponse).mockResolvedValueOnce(response('Pikachu'));
    const hook = setup(searchCards);
    act(() => hook.result.current.setInput('Rayquaza'));
    act(() => hook.result.current.search());
    await waitFor(() => expect(searchCards).toHaveBeenCalledTimes(1));
    const firstSignal = searchCards.mock.calls[0][2]!;
    await submit(hook, 'Pikachu');
    expect(firstSignal.aborted).toBe(true);
    await act(async () => resolveOld(response('Rayquaza')));
    expect(hook.result.current.results.data?.data[0].id).toBe('Pikachu-1');
    expect(hook.result.current.query).toBe('Pikachu');
  });

  it('cancels a pending page on close and resets reopened dialogs with the current card name', async () => {
    const searchCards = vi.fn<SearchCards>().mockResolvedValueOnce(response('Rayquaza')).mockImplementationOnce(() => new Promise(() => {}));
    const hook = setup(searchCards);
    await submit(hook, 'Rayquaza');
    act(() => hook.result.current.changePage(2));
    await waitFor(() => expect(searchCards).toHaveBeenCalledTimes(2));
    const signal = searchCards.mock.calls[1][2]!;
    hook.rerender({ open: false });
    expect(signal.aborted).toBe(true);
    act(() => hook.result.current.reset('Bulbasaur'));
    hook.rerender({ open: true });
    expect(hook.result.current.input).toBe('Bulbasaur');
    expect(hook.result.current.query).toBe('');
    expect(hook.result.current.page).toBe(1);
    expect(hook.result.current.results.data).toBeUndefined();
    expect(searchCards).toHaveBeenCalledTimes(2);
  });

  it('does not request short names or change pages during an active fetch', async () => {
    let resolve!: (value: PokemonTcgSearchResult) => void;
    const searchCards = vi.fn<SearchCards>(() => new Promise((done) => { resolve = done; }));
    const hook = setup(searchCards);
    act(() => hook.result.current.setInput(' R '));
    act(() => hook.result.current.search());
    act(() => hook.result.current.retry());
    expect(searchCards).not.toHaveBeenCalled();
    act(() => hook.result.current.setInput('Rayquaza'));
    act(() => hook.result.current.search());
    act(() => hook.result.current.changePage(2));
    expect(hook.result.current.page).toBe(1);
    expect(searchCards).toHaveBeenCalledTimes(1);
    await act(async () => resolve(response('Rayquaza')));
  });
});
