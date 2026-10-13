import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PokemonTcgPricePicker } from '@/shared/pokemon-tcg/price-picker';
import { getPokemonTcgPriceHistory } from '@/shared/pokemon-tcg/price-api';
import { searchPokemonTcgCards } from '@/features/product-management/infrastructure/api';
import type { PokemonTcgCardSummary } from '@/shared/pokemon-tcg/contracts';

vi.mock('@/features/product-management/infrastructure/api', () => ({ searchPokemonTcgCards: vi.fn() }));
vi.mock('@/features/affiliate/infrastructure/api', () => ({ searchAffiliatePokemonTcgCards: vi.fn() }));
vi.mock('@/shared/pokemon-tcg/price-api', () => ({ getPokemonTcgPriceHistory: vi.fn() }));

const card: PokemonTcgCardSummary = {
  id: '15618', name: 'Rayquaza-EX', localId: '98', setCode: 'AOR', setName: 'Ancient Origins', imageUrl: null,
  marketPrice: { amountMinor: '6097', currency: 'USD', source: 'tcgplayer', variant: 'holofoil', updatedAt: '2026-10-06T00:00:00Z' },
  prices: [
    { source: 'tcgplayer', currency: 'USD', variant: 'reverse-holofoil', amountMinor: '5050', lowAmountMinor: null, highAmountMinor: null, updatedAt: '2026-10-07T00:00:00Z' },
    { source: 'cardmarket', currency: 'EUR', variant: 'normal', amountMinor: '2000', lowAmountMinor: null, highAmountMinor: null, updatedAt: '2026-10-07T00:00:00Z' },
  ],
};

async function openPicker(selected = card, pages = 1) {
  vi.mocked(searchPokemonTcgCards).mockResolvedValue({ data: [selected], meta: { page: 1, limit: 20, total: pages === 1 ? 1 : 21, totalPages: pages } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onApply = vi.fn();
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(<QueryClientProvider client={client}><form onSubmit={onSubmit}><PokemonTcgPricePicker scope="admin" cardName="Rayquaza" onApply={onApply} /></form></QueryClientProvider>);
  const trigger = screen.getByRole('button', { name: 'Buscar precio' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByRole('textbox', { name: 'Nombre o parte del nombre' })).toHaveValue('Rayquaza');
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Nombre o parte del nombre' })).toHaveFocus());
  expect(searchPokemonTcgCards).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Buscar carta' }));
  await screen.findByRole('article', { name: selected.name });
  return { onApply, onSubmit };
}

describe('price picker', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('only requests history on demand and cancels a pending history when the modal closes', async () => {
    vi.mocked(getPokemonTcgPriceHistory).mockImplementation(() => new Promise(() => {}));
    await openPicker();
    expect(getPokemonTcgPriceHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial de precios' }));
    await waitFor(() => expect(getPokemonTcgPriceHistory).toHaveBeenCalledWith('admin', card.id, expect.any(AbortSignal)));
    const signal = vi.mocked(getPokemonTcgPriceHistory).mock.calls[0][2]!;
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(signal.aborted).toBe(true));
  });

  it('allows choosing a specific USD variant without converting a EUR quote or submitting its parent form', async () => {
    const { onApply, onSubmit } = await openPicker();
    fireEvent.click(screen.getByText('Ver todos los precios', { exact: false }).closest('summary')!);
    expect(screen.getByText('EUR 20,00')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Usar EUR/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Usar USD 50,50 de TCGPlayer, Reverse Holo' }));
    expect(onApply).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ amountMinor: '5050', currency: 'USD', variant: 'reverse-holofoil' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(getPokemonTcgPriceHistory).not.toHaveBeenCalled();
  });

  it('keeps history accessible when no current USD price is available', async () => {
    const { onApply } = await openPicker({ ...card, marketPrice: null, prices: [] });
    expect(screen.getByRole('button', { name: /Usar precio de Rayquaza-EX/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver historial de precios' })).toBeEnabled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('uses the same dialog for history and returns to the second page with unsent input, scroll and focus intact', async () => {
    const pageTwoCard = { ...card, id: '20000', name: 'Rayquaza final', localId: 'CC24', setCode: 'CEL', setName: 'Celebrations' };
    vi.mocked(getPokemonTcgPriceHistory).mockResolvedValue({ cardId: pageTwoCard.id, prices: [] });
    const { onSubmit } = await openPicker(card, 2);
    vi.mocked(searchPokemonTcgCards).mockResolvedValueOnce({ data: [pageTwoCard], meta: { page: 2, limit: 20, total: 21, totalPages: 2 } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    const article = await screen.findByRole('article', { name: pageTwoCard.name });
    const dialog = screen.getByRole('dialog', { name: 'Buscar precio de venta' });
    const input = screen.getByRole('textbox', { name: 'Nombre o parte del nombre' });
    fireEvent.change(input, { target: { value: 'Pikachu sin buscar' } });
    const resultsId = input.getAttribute('aria-controls')!;
    const results = document.getElementById(resultsId)!;
    results.scrollTop = 372;
    dialog.scrollTop = 121;
    const historyTrigger = within(article).getByRole('button', { name: 'Ver historial de precios' });
    historyTrigger.focus();
    fireEvent.click(historyTrigger);

    expect(screen.getByRole('dialog', { name: 'Historial de precios' })).toBe(dialog);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.queryByRole('textbox', { name: 'Nombre o parte del nombre' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Páginas de resultados' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: pageTwoCard.name })).toBeVisible();
    expect(screen.getByText(pageTwoCard.setName)).toBeVisible();
    expect(screen.getByText('Set CEL · N.º CC24')).toBeVisible();
    const back = screen.getByRole('button', { name: 'Volver a resultados' });
    await waitFor(() => expect(back).toHaveFocus());
    expect(dialog.scrollTop).toBe(0);
    await screen.findByText('Todavía no hay precios históricos disponibles para esta carta.');
    expect(getPokemonTcgPriceHistory).toHaveBeenCalledExactlyOnceWith('admin', pageTwoCard.id, expect.any(AbortSignal));

    fireEvent.click(back);

    expect(screen.getByRole('dialog', { name: 'Buscar precio de venta' })).toBe(dialog);
    expect(screen.getByRole('textbox', { name: 'Nombre o parte del nombre' })).toHaveValue('Pikachu sin buscar');
    expect(screen.getByRole('navigation', { name: 'Páginas de resultados' })).toHaveTextContent('Página 2 de 2');
    expect(screen.getByRole('status')).toHaveTextContent('21 cartas encontradas para “Rayquaza”');
    expect(document.getElementById(resultsId)!.scrollTop).toBe(372);
    expect(dialog.scrollTop).toBe(121);
    expect(screen.getByRole('button', { name: 'Ver historial de precios' })).toHaveFocus();
    expect(searchPokemonTcgCards).toHaveBeenCalledTimes(2);
    expect(searchPokemonTcgCards).toHaveBeenLastCalledWith('Rayquaza', 2, expect.any(AbortSignal));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels a pending history request when returning to results', async () => {
    vi.mocked(getPokemonTcgPriceHistory).mockImplementation(() => new Promise(() => {}));
    const { onSubmit } = await openPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial de precios' }));
    await waitFor(() => expect(getPokemonTcgPriceHistory).toHaveBeenCalledOnce());
    const signal = vi.mocked(getPokemonTcgPriceHistory).mock.calls[0][2]!;
    expect(signal.aborted).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Volver a resultados' }));

    await waitFor(() => expect(signal.aborted).toBe(true));
    expect(screen.getByRole('article', { name: card.name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver historial de precios' })).toHaveFocus();
    expect(searchPokemonTcgCards).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(['close', 'apply current price'] as const)('starts a fresh search view after reopening from history via %s', async (action) => {
    vi.mocked(getPokemonTcgPriceHistory).mockResolvedValue({ cardId: card.id, prices: [] });
    const { onApply, onSubmit } = await openPicker();
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre o parte del nombre' }), { target: { value: 'Texto sin enviar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial de precios' }));
    await screen.findByText('Todavía no hay precios históricos disponibles para esta carta.');

    fireEvent.click(screen.getByRole('button', { name: action === 'close' ? 'Cerrar' : 'Usar precio actual' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar precio' })).toHaveFocus();
    if (action === 'apply current price') expect(onApply).toHaveBeenCalledExactlyOnceWith(card.marketPrice);
    else expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar precio' }));

    expect(screen.getByRole('dialog', { name: 'Buscar precio de venta' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre o parte del nombre' })).toHaveValue('Rayquaza');
    expect(screen.getByText('Encontrá la versión exacta')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Volver a resultados' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Páginas de resultados' })).not.toBeInTheDocument();
    expect(searchPokemonTcgCards).toHaveBeenCalledOnce();
    expect(getPokemonTcgPriceHistory).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
