import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogBrowser } from '@/features/catalog';

const navigation = vi.hoisted(() => ({ replace: vi.fn(), params: new URLSearchParams() }));
const api = vi.hoisted(() => ({
  getCatalogFilters: vi.fn(),
  listProducts: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.params,
}));

vi.mock('@/features/catalog/infrastructure/api', () => ({
  getCatalogFilters: api.getCatalogFilters,
  listProducts: api.listProducts,
}));

describe('catalog browser interactions', () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    navigation.params = new URLSearchParams();
    api.listProducts.mockResolvedValue({ data: [], meta: { nextCursor: null } });
    api.getCatalogFilters.mockResolvedValue({
      totalProducts: 2,
      kinds: [{ value: 'SINGLE_CARD', count: 2 }],
      pokemonTypes: [{ value: 'FIRE', count: 1 }, { value: 'WATER', count: 1 }],
      sets: [], rarities: [], conditions: [], languages: [], finishes: [], editions: [], gradingCompanies: [],
      priceRange: { minMinor: '10000', maxMinor: '20000' },
    });
  });

  it('keeps both values when facet toggles happen before URL navigation settles', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><CatalogBrowser /></QueryClientProvider>);

    const fire = await screen.findByRole('button', { name: /^Fuego/ });
    const water = screen.getByRole('button', { name: /^Agua/ });
    fireEvent.click(fire);
    fireEvent.click(water);

    await waitFor(() => {
      const lastUrl = navigation.replace.mock.calls.at(-1)?.[0] as string;
      expect(lastUrl).toContain('pokemonType=FIRE');
      expect(lastUrl).toContain('pokemonType=WATER');
      expect(fire).toHaveAttribute('aria-pressed', 'true');
      expect(water).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
