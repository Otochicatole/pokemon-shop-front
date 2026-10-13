import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PokemonTcgCardSummary, PokemonTcgPriceHistoryPoint } from '@/shared/pokemon-tcg/contracts';
import { PokemonTcgPriceHistory } from '@/shared/pokemon-tcg/price-history';
import { getPokemonTcgPriceHistory } from '@/shared/pokemon-tcg/price-api';

vi.mock('@/shared/pokemon-tcg/price-api', () => ({ getPokemonTcgPriceHistory: vi.fn() }));

const card: PokemonTcgCardSummary = { id: '15618', name: 'Rayquaza-EX', localId: '98', setCode: 'AOR', setName: 'Ancient Origins', imageUrl: null };
const point: PokemonTcgPriceHistoryPoint = { sourceId: '1', source: 'tcgplayer', currency: 'USD', variant: 'holofoil', amountMinor: '6097', recordedAt: '2026-10-06', observedAt: '2026-10-06T01:10:00Z' };

function setup({ points = [point], scope = 'admin', pending = false }: { points?: PokemonTcgPriceHistoryPoint[]; scope?: 'admin' | 'affiliate'; pending?: boolean } = {}) {
  if (!pending) vi.mocked(getPokemonTcgPriceHistory).mockResolvedValue({ cardId: card.id, prices: points });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const onApply = vi.fn();
  const content = (shown: boolean) => <QueryClientProvider client={client}>{shown && <PokemonTcgPriceHistory card={card} scope={scope} onApply={onApply} />}</QueryClientProvider>;
  const view = render(content(true));
  return { ...view, onApply, show: (shown: boolean) => view.rerender(content(shown)) };
}

beforeEach(() => vi.clearAllMocks());

describe('Pokémon TCG price history', () => {
  it('loads the selected card with an abort signal and applies the exact dated USD quote', async () => {
    const user = userEvent.setup();
    const view = setup();
    const table = await screen.findByRole('table');
    expect(getPokemonTcgPriceHistory).toHaveBeenCalledExactlyOnceWith('admin', '15618', expect.any(AbortSignal));
    expect(table).toHaveTextContent('6/10/2026');
    expect(table).toHaveTextContent('USD 60,97');
    expect(await screen.findByRole('figure', { name: /Evolución de TCGPlayer · Holo · USD/ })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Usar precio del 6/10/2026' }));
    expect(view.onApply).toHaveBeenCalledExactlyOnceWith({ amountMinor: '6097', currency: 'USD', source: 'tcgplayer', variant: 'holofoil', updatedAt: '2026-10-06T01:10:00Z' });
  });

  it('uses the record date at UTC midnight when the provider has no observation timestamp', async () => {
    const user = userEvent.setup();
    const view = setup({ points: [{ ...point, observedAt: null }] });
    await user.click(await screen.findByRole('button', { name: 'Usar precio del 6/10/2026' }));
    expect(view.onApply).toHaveBeenCalledWith(expect.objectContaining({ updatedAt: '2026-10-06T00:00:00Z' }));
  });

  it('keeps sources, variants and currencies separate, and never applies an EUR amount to the USD field', async () => {
    const user = userEvent.setup();
    const points = [
      { ...point, sourceId: '2', source: 'cardmarket', currency: 'EUR', amountMinor: '4178' },
      point,
      { ...point, variant: 'reverse-holofoil', amountMinor: '7500' },
    ];
    const view = setup({ points, scope: 'affiliate' });
    const select = await screen.findByRole('combobox', { name: 'Mercado, variante y moneda' });
    expect(getPokemonTcgPriceHistory).toHaveBeenCalledWith('affiliate', card.id, expect.any(AbortSignal));
    expect(within(select).getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('table')).toHaveTextContent('USD 60,97');
    expect(screen.getByRole('table')).not.toHaveTextContent('EUR');
    await user.selectOptions(select, within(select).getByRole('option', { name: 'Cardmarket · Holo · EUR' }));
    expect(screen.getByRole('table')).toHaveTextContent('EUR 41,78');
    expect(screen.getByRole('table')).not.toHaveTextContent('USD');
    expect(await screen.findByRole('figure')).toHaveAccessibleName(/Cardmarket · Holo · EUR/);
    expect(screen.queryByRole('button', { name: /Usar precio del/ })).not.toBeInTheDocument();
    expect(screen.getByText(/El precio de venta se completa con importes en USD/)).toBeVisible();
    await user.selectOptions(select, within(select).getByRole('option', { name: 'TCGPlayer · Reverse Holo · USD' }));
    expect(screen.getByRole('table')).toHaveTextContent('USD 75,00');
    await user.click(screen.getByRole('button', { name: /Usar precio del/ }));
    expect(view.onApply).toHaveBeenCalledWith(expect.objectContaining({ variant: 'reverse-holofoil', amountMinor: '7500' }));
  });

  it('orders observations newest first and paginates locally, resetting the table for another series', async () => {
    const user = userEvent.setup();
    const points = Array.from({ length: 12 }, (_, index) => ({ ...point, recordedAt: `2026-10-${String(index + 1).padStart(2, '0')}`, observedAt: null }));
    points.push({ ...point, sourceId: '2', source: 'cardmarket', currency: 'EUR', observedAt: null });
    setup({ points });
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('12/10/2026');
    expect(screen.getByRole('status')).toHaveTextContent('1–10 de 12 registros');
    expect(screen.getByRole('button', { name: 'Registros anteriores' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Registros siguientes' }));
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('2/10/2026');
    expect(screen.getByRole('status')).toHaveTextContent('11–12 de 12 registros');
    expect(screen.getByRole('button', { name: 'Registros siguientes' })).toBeDisabled();
    expect(getPokemonTcgPriceHistory).toHaveBeenCalledOnce();
    await user.selectOptions(screen.getByRole('combobox'), screen.getByRole('option', { name: 'Cardmarket · Holo · EUR' }));
    expect(screen.getByRole('status')).toHaveTextContent('1–1 de 1 registros');
    expect(screen.queryByRole('navigation', { name: 'Páginas del historial' })).not.toBeInTheDocument();
  });

  it('keeps zero observations visible without providing a zero-price action', async () => {
    setup({ points: [{ ...point, amountMinor: '0' }] });
    expect(await screen.findByRole('table')).toHaveTextContent('USD 0,00');
    expect(screen.getByText('No aplicable')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Usar precio del/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('figure')).toHaveTextContent('1 registro');
  });

  it('cancels a pending request on collapse and shows a real empty state when no history exists', async () => {
    let resolve!: (value: { cardId: string; prices: PokemonTcgPriceHistoryPoint[] }) => void;
    vi.mocked(getPokemonTcgPriceHistory).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const view = setup({ pending: true });
    expect(screen.getByRole('status')).toHaveTextContent('Cargando historial de Rayquaza-EX…');
    const signal = vi.mocked(getPokemonTcgPriceHistory).mock.calls[0][2]!;
    view.show(false);
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ cardId: card.id, prices: [point] }));
    vi.mocked(getPokemonTcgPriceHistory).mockResolvedValueOnce({ cardId: card.id, prices: [] });
    view.show(true);
    expect(await screen.findByText('Todavía no hay precios históricos disponibles para esta carta.')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('distinguishes failure from no history and retries the same selected card', async () => {
    const user = userEvent.setup();
    vi.mocked(getPokemonTcgPriceHistory).mockRejectedValueOnce(new Error('service unavailable')).mockResolvedValueOnce({ cardId: card.id, prices: [point] });
    setup({ pending: true });
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el historial. Volvé a intentarlo.');
    expect(screen.queryByText(/Todavía no hay precios/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar historial' }));
    expect(await screen.findByRole('table')).toHaveTextContent('USD 60,97');
    expect(getPokemonTcgPriceHistory).toHaveBeenCalledTimes(2);
    expect(getPokemonTcgPriceHistory).toHaveBeenLastCalledWith('admin', card.id, expect.any(AbortSignal));
  });

  it('reuses a recently visited card history when reopened', async () => {
    const view = setup();
    await screen.findByRole('table');
    view.show(false);
    view.show(true);
    await waitFor(() => expect(screen.getByRole('table')).toHaveTextContent('USD 60,97'));
    expect(getPokemonTcgPriceHistory).toHaveBeenCalledOnce();
  });

  it('filters chart and table by the latest real record date, retaining sparse old histories', async () => {
    const user = userEvent.setup();
    const points = [
      { ...point, recordedAt: '2015-02-10', observedAt: null },
      { ...point, recordedAt: '2014-03-15', observedAt: null },
      { ...point, recordedAt: '2005-06-01', observedAt: null },
    ];
    setup({ points });
    const table = await screen.findByRole('table');
    expect(screen.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true');
    expect(table).toHaveTextContent('10/2/2015');
    expect(table).not.toHaveTextContent('1/6/2005');
    await user.click(screen.getByRole('button', { name: 'Todo' }));
    expect(table).toHaveTextContent('1/6/2005');
    await user.click(screen.getByRole('button', { name: '30 días' }));
    expect(table).toHaveTextContent('10/2/2015');
    expect(table).not.toHaveTextContent('15/3/2014');
    expect(table).not.toHaveTextContent('1/6/2005');
    expect(await screen.findByRole('figure')).toHaveTextContent('1 registro · 10/2/2015–10/2/2015');
    await user.click(screen.getByRole('button', { name: '1 año' }));
    expect(table).toHaveTextContent('15/3/2014');
    expect(await screen.findByRole('figure')).toHaveTextContent('2 registros');
    await user.click(screen.getByRole('button', { name: 'Todo' }));
    expect(table).toHaveTextContent('1/6/2005');
    expect(await screen.findByRole('figure')).toHaveTextContent('3 registros');
    expect(getPokemonTcgPriceHistory).toHaveBeenCalledOnce();
  });
});
