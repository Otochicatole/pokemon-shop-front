import type { ComponentProps } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PokemonTcgSearchDialog } from '@/shared/pokemon-tcg/search-dialog';
import type { PokemonTcgCardSummary } from '@/shared/pokemon-tcg/contracts';
import { pokemonTcgSearchEnvelopeSchema as adminSearchSchema } from '@/features/product-management/domain/contracts';
import { pokemonTcgSearchEnvelopeSchema as affiliateSearchSchema } from '@/features/affiliate/domain/contracts';

const card: PokemonTcgCardSummary = {
  id: '15618', name: 'Rayquaza-EX', localId: '98', setCode: 'AOR', setName: 'Ancient Origins',
  imageUrl: 'https://img.pokemon-tcg.dev/tpci/AOR/AOR_98_R_EN_LG.png',
  rarity: 'Secret Rare', category: 'Pokemon', types: ['Dragon', 'Colorless'],
  language: 'Inglés', region: 'int', special: 'EX', holo: true, firstEdition: true,
  marketPrice: {
    amountMinor: '6097', currency: 'USD', source: 'tcgplayer', variant: 'holofoil', updatedAt: '2026-10-06T14:51:23Z',
  },
  prices: [
    { source: 'tcgplayer', currency: 'USD', variant: 'holofoil', amountMinor: '6097', lowAmountMinor: '5500', highAmountMinor: '109900', updatedAt: '2026-10-06T14:51:23Z' },
    { source: 'cardmarket', currency: 'EUR', variant: 'reverse-holofoil', amountMinor: '4178', lowAmountMinor: '3870', highAmountMinor: null, updatedAt: '2026-10-11T09:00:00Z' },
  ],
};

function props(overrides: Partial<ComponentProps<typeof PokemonTcgSearchDialog>> = {}): ComponentProps<typeof PokemonTcgSearchDialog> {
  return {
    open: true, onClose: vi.fn(), input: 'Rayquaza', onInputChange: vi.fn(), onSearch: vi.fn(),
    query: 'Rayquaza', cards: [card], isFetching: false, isError: false, loadingId: null, onSelect: vi.fn(),
    ...overrides,
  };
}

describe('Pokémon TCG search dialog', () => {
  it('shows the card metadata with distinct collection name and code before selection', () => {
    render(<PokemonTcgSearchDialog {...props()} />);
    const result = screen.getByRole('article', { name: card.name });
    const metadata: Record<string, string> = {
      'Colección / set': 'Ancient Origins', 'Código de set': 'AOR', 'Número de carta': '98',
      Rareza: 'Secret Rare', 'Tipo / atributo': 'Dragon / Colorless', Categoría: 'Pokémon',
      Idioma: 'Inglés', Región: 'Internacional', Especial: 'EX', Acabado: 'Holo', Edición: '1.ª edición',
    };
    for (const [label, value] of Object.entries(metadata)) {
      const definition = within(result).getByText(label, { selector: 'dt' }).nextElementSibling;
      expect(definition).toHaveTextContent(value);
    }
    expect(within(result).getByRole('img', { name: 'Carta Rayquaza-EX, AOR 98' })).toHaveAttribute('src', card.imageUrl);
    expect(screen.getByRole('status')).toHaveTextContent('1 carta encontrada');
  });

  it('shows the USD reference and expands all currencies, variants, ranges and update dates', async () => {
    const user = userEvent.setup();
    render(<PokemonTcgSearchDialog {...props()} />);
    expect(screen.getByText('USD 60,97', { selector: 'strong' })).toBeVisible();
    expect(screen.getByText('TCGPlayer · Holo')).toBeVisible();
    const summary = screen.getByText('Ver todos los precios', { exact: false }).closest('summary')!;
    expect(summary.closest('details')).not.toHaveAttribute('open');
    await user.click(summary);
    const table = screen.getByRole('table');
    expect(table).toBeVisible();
    const usd = within(table).getByRole('row', { name: /TCGPlayer/ });
    expect(usd).toHaveTextContent('USD 60,97');
    expect(usd).toHaveTextContent('USD 55,00');
    expect(usd).toHaveTextContent('USD 1.099,00');
    expect(usd).toHaveTextContent('6/10/2026');
    const eur = within(table).getByRole('row', { name: /Cardmarket/ });
    expect(eur).toHaveTextContent('Reverse Holo');
    expect(eur).toHaveTextContent('EUR 41,78');
    expect(eur).toHaveTextContent('EUR 38,70');
    expect(eur).toHaveTextContent('No informado');
    expect(eur).toHaveTextContent('11/10/2026');
  });

  it('keeps a card selectable without inventing a zero price when the API has no quote', () => {
    render(<PokemonTcgSearchDialog {...props({ cards: [{ ...card, marketPrice: null, prices: [] }] })} />);
    expect(screen.getByText('Sin referencia en USD')).toBeVisible();
    expect(screen.getByText('Podés ingresar el precio manualmente.')).toBeVisible();
    expect(screen.queryByText(/USD 0,00/)).not.toBeInTheDocument();
    expect(screen.queryByText('Ver todos los precios', { exact: false })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usar carta Rayquaza-EX/ })).toBeEnabled();
  });

  it('distinguishes a failed query from no matches and retries the search', async () => {
    const user = userEvent.setup();
    const values = props({ cards: [], isError: true, errorMessage: 'El catálogo no está disponible.' });
    render(<PokemonTcgSearchDialog {...values} />);
    expect(screen.getByRole('alert')).toHaveTextContent('El catálogo no está disponible.');
    expect(screen.queryByText(/No encontramos cartas/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar búsqueda' }));
    expect(values.onSearch).toHaveBeenCalledOnce();
  });

  it('selects the requested printing and prevents another selection while details load', async () => {
    const user = userEvent.setup();
    const other = { ...card, id: '15619', setCode: 'CEL', setName: 'Celebrations', localId: 'CC24' };
    const values = props({ cards: [card, other] });
    const view = render(<PokemonTcgSearchDialog {...values} />);
    await user.click(screen.getByRole('button', { name: 'Usar carta Rayquaza-EX, Celebrations, número CC24' }));
    expect(values.onSelect).toHaveBeenCalledExactlyOnceWith(other);
    view.rerender(<PokemonTcgSearchDialog {...values} loadingId={other.id} />);
    const first = screen.getByRole('button', { name: 'Usar carta Rayquaza-EX, Ancient Origins, número 98' });
    const selected = screen.getByRole('button', { name: 'Usar carta Rayquaza-EX, Celebrations, número CC24' });
    expect(first).toBeDisabled();
    expect(selected).toBeDisabled();
    expect(selected).toHaveTextContent('Completando…');
    expect(screen.getByRole('button', { name: 'Buscar carta' })).toBeDisabled();
    await user.click(first);
    expect(values.onSelect).toHaveBeenCalledOnce();
  });

  it('focuses search, handles Enter without submitting its parent and supports Escape and close', async () => {
    const user = userEvent.setup();
    const values = props();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<form onSubmit={submit}><PokemonTcgSearchDialog {...values} /></form>);
    const input = screen.getByRole('textbox', { name: 'Nombre o parte del nombre' });
    await waitFor(() => expect(input).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(values.onSearch).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(values.onClose).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(values.onClose).toHaveBeenCalledTimes(2);
  });

  it('hides stale matches and disables searches while the next result is loading', () => {
    render(<PokemonTcgSearchDialog {...props({ isFetching: true })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Buscando cartas y precios…');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar carta' })).toBeDisabled();
    expect(screen.queryByText(/No encontramos cartas/)).not.toBeInTheDocument();
  });

  it('preserves every listing field through both admin and affiliate response schemas', () => {
    for (const schema of [adminSearchSchema, affiliateSearchSchema]) {
      const parsed = schema.parse({ data: [card] });
      expect(parsed.data).toEqual([card]);
    }
  });
});
