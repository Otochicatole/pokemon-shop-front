import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PokemonTcgPriceHistoryChart from '@/shared/pokemon-tcg/price-history-chart';
import type { PokemonTcgPriceHistoryPoint } from '@/shared/pokemon-tcg/contracts';

const point: PokemonTcgPriceHistoryPoint = { sourceId: '1', source: 'tcgplayer', currency: 'USD', variant: 'holofoil', amountMinor: '6097', recordedAt: '2026-10-06', observedAt: null };
const rectangle = { width: 800, height: 280, left: 0, top: 0, right: 800, bottom: 280, x: 0, y: 0, toJSON: () => ({}) };

beforeEach(() => {
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerType: string;
    constructor(type: string, params: PointerEventInit = {}) { super(type, params); this.pointerType = params.pointerType ?? ''; }
  });
  vi.stubGlobal('ResizeObserver', class implements ResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) { this.callback([{ contentRect: rectangle, target } as ResizeObserverEntry], this); }
    unobserve() {}
    disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rectangle);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(280);
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('interactive Pokémon TCG history chart', () => {
  it('plots actual observations with readable points and exact keyboard tooltips', async () => {
    const points = [point, { ...point, amountMinor: '6178', recordedAt: '2026-10-07' }];
    const { container } = render(<PokemonTcgPriceHistoryChart points={points} source="tcgplayer" currency="USD" variant="holofoil" />);
    const chart = await screen.findByRole('application', { name: 'Evolución de TCGPlayer · Holo · USD' });
    const dots = container.querySelectorAll('.recharts-line-dot');
    expect(dots).toHaveLength(2);
    for (const dot of dots) expect(dot).toHaveAttribute('r', '4');
    expect(Number(dots[0].getAttribute('cx'))).toBeLessThan(Number(dots[1].getAttribute('cx')));
    fireEvent.focus(chart);
    expect(await screen.findByRole('status')).toHaveTextContent('USD 60,97');
    expect(screen.getByRole('status')).toHaveTextContent('6/10/2026 · UTC');
    expect(screen.getByRole('status')).toHaveTextContent('TCGPlayer · Holo');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('USD 61,78'));
    expect(screen.getByRole('status')).toHaveTextContent('7/10/2026 · UTC');
    expect(container.querySelector('.recharts-active-dot circle')).toHaveAttribute('r', '6');
  });

  it('keeps a single flat zero observation visible and uses its real date', async () => {
    const { container } = render(<PokemonTcgPriceHistoryChart points={[{ ...point, amountMinor: '0', recordedAt: '2015-02-10' }]} source="tcgplayer" currency="USD" variant="holofoil" />);
    const chart = await screen.findByRole('application');
    const dot = container.querySelector('.recharts-line-dot')!;
    expect(Number.isFinite(Number(dot.getAttribute('cx')))).toBe(true);
    expect(Number.isFinite(Number(dot.getAttribute('cy')))).toBe(true);
    fireEvent.focus(chart);
    expect(await screen.findByRole('status')).toHaveTextContent('USD 0,00');
    expect(screen.getByRole('status')).toHaveTextContent('10/2/2015');
    expect(screen.getByRole('figure')).toHaveTextContent('1 registro');
  });

  it('reveals the exact price when a touch lands on the chart', async () => {
    const { container } = render(<PokemonTcgPriceHistoryChart points={[point, { ...point, amountMinor: '6275', recordedAt: '2026-10-08' }]} source="tcgplayer" currency="USD" variant="holofoil" />);
    await screen.findByRole('application');
    const dots = container.querySelectorAll('.recharts-line-dot');
    const target = dots[1];
    const wrapper = container.querySelector('.recharts-wrapper')!;
    fireEvent.pointerDown(wrapper, { pointerType: 'touch' });
    fireEvent.click(wrapper, { clientX: Number(target.getAttribute('cx')), clientY: Number(target.getAttribute('cy')) });
    expect(await screen.findByRole('status')).toHaveTextContent('USD 62,75');
    expect(screen.getByRole('status')).toHaveTextContent('8/10/2026 · UTC');
  });

  it('preserves exact minor units and original currency in the tooltip despite numeric chart coordinates', async () => {
    const { container } = render(<PokemonTcgPriceHistoryChart points={[{ ...point, source: 'cardmarket', currency: 'EUR', variant: 'reverse-holofoil', amountMinor: '900719925474099301' }]} source="cardmarket" currency="EUR" variant="reverse-holofoil" />);
    const chart = await screen.findByRole('application');
    fireEvent.focus(chart);
    expect(await screen.findByRole('status')).toHaveTextContent('EUR 9.007.199.254.740.993,01');
    expect(screen.getByRole('status')).toHaveTextContent('Cardmarket · Reverse Holo');
    expect(container.querySelectorAll('.recharts-line-dot')).toHaveLength(1);
  });

  it('shows an empty state without inventing observations', () => {
    render(<PokemonTcgPriceHistoryChart points={[]} source="tcgplayer" currency="USD" variant="holofoil" />);
    expect(screen.getByText('No hay registros para graficar en este período.')).toBeVisible();
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
  });
});
