import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProductEditor } from '@/features/product-management/ui/admin-product-editor';
import { SupplierPurchaseFormView } from '@/features/supplier-management/ui/supplier-purchase-form';
import { AffiliateListingCreateForm, AffiliateListingEditForm } from '@/features/affiliate/ui/affiliate-listing-editor';
import { adminProductSchema, pokemonTcgCardSchema, type PokemonTcgCard } from '@/features/product-management/domain/contracts';
import { affiliateListingSchema } from '@/features/affiliate/domain/contracts';
import { createAdminProduct, getAdminProduct, getPokemonTcgCard, searchPokemonTcgCards, updateAdminProduct } from '@/features/product-management/infrastructure/api';
import { createAffiliateListing, getAffiliatePokemonTcgCard, searchAffiliatePokemonTcgCards, updateAffiliateListing } from '@/features/affiliate/infrastructure/api';
import { registerPurchase } from '@/features/supplier-management/application';
import { pokemonTcgAutofill } from '@/shared/pokemon-tcg/autofill';
import { selectedSetId, setSelectOptions } from '@/shared/pokemon-tcg/sets';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/feedback', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/features/product-management/infrastructure/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/product-management/infrastructure/api')>(),
  createAdminProduct: vi.fn(), getAdminProduct: vi.fn(), updateAdminProduct: vi.fn(),
  getPokemonTcgCard: vi.fn(), searchPokemonTcgCards: vi.fn(),
  listPokemonTcgRarities: vi.fn().mockResolvedValue(['Rare']),
  listPokemonTcgSets: vi.fn().mockResolvedValue([{ id: 'BS', name: 'Base Set' }, { id: '30C', name: '30C' }, { id: 'MEW', name: 'MEW' }]),
}));
vi.mock('@/features/affiliate/infrastructure/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/affiliate/infrastructure/api')>(),
  createAffiliateListing: vi.fn().mockResolvedValue({ id: 'listing-1', productId: 'product-1' }),
  updateAffiliateListing: vi.fn().mockResolvedValue({ id: 'listing-1', version: 2, status: 'DRAFT' }),
  getAffiliatePokemonTcgCard: vi.fn(), searchAffiliatePokemonTcgCards: vi.fn(),
  listAffiliatePokemonTcgRarities: vi.fn().mockResolvedValue(['Rare']),
  listAffiliatePokemonTcgSets: vi.fn().mockResolvedValue([{ id: 'BS', name: 'Base Set' }, { id: '30C', name: '30C' }, { id: 'MEW', name: 'MEW' }]),
}));
vi.mock('@/features/supplier-management/application', () => ({
  loadSupplier: vi.fn().mockResolvedValue({ id: 'supplier-1', name: 'Proveedor' }),
  registerPurchase: vi.fn().mockResolvedValue({ items: [] }),
}));

const card: PokemonTcgCard = {
  id: '248', name: 'Charizard', localId: '4', setCode: 'BS', setName: 'Base Set',
  imageUrl: null, description: '', effect: '', rarity: '', category: 'Pokemon', types: [],
  firstEdition: false, holo: false, language: 'Inglés',
  marketPrice: { amountMinor: '12345', currency: 'USD', source: 'tcgplayer', variant: 'holofoil', updatedAt: '2026-10-12T00:00:00Z' },
};
const listing = affiliateListingSchema.parse({
  id: 'listing-1', status: 'DRAFT', reviewNote: null, submittedAt: null, reviewedAt: null,
  createdAt: '2026-10-12', updatedAt: '2026-10-12',
  product: {
    id: 'product-1', sku: 'OLD', slug: 'old-card', name: 'Carta existente', description: 'Descripción propia',
    kind: 'SINGLE_CARD', stockMode: 'UNIQUE', priceMinor: '1500', status: 'DRAFT', version: 1,
    inventory: { onHand: 1, reserved: 0, available: 1, version: 1 }, pokemonCard: null,
    images: [], listing: null, createdAt: '2026-10-12', updatedAt: '2026-10-12',
  },
});
const product = adminProductSchema.parse({
  ...listing.product,
  price: { amountMinor: '1500', currency: 'USD' },
  cost: { amountMinor: '500', currency: 'USD' },
});

function renderEditor(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

async function selectCard() {
  fireEvent.click(await screen.findByRole('button', { name: 'Autocompletar con Pokémon TCG' }));
  fireEvent.change(screen.getByLabelText('Nombre o parte del nombre'), { target: { value: 'Charizard' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar carta' }));
  fireEvent.click(await screen.findByRole('button', { name: /Charizard/ }));
  await waitFor(() => expect(screen.getByLabelText(/^Nombre$/)).toHaveValue('Charizard'));
}

describe('Pokémon TCG autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchPokemonTcgCards).mockResolvedValue({ data: [card], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    vi.mocked(searchAffiliatePokemonTcgCards).mockResolvedValue({ data: [card], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    vi.mocked(getAdminProduct).mockResolvedValue(product);
    vi.mocked(createAdminProduct).mockResolvedValue(product);
    vi.mocked(updateAdminProduct).mockResolvedValue({ ...product, version: 2 });
  });

  const editors = [
    { name: 'admin create', node: () => <AdminProductEditor />, cost: /Precio de compra/, save: 'Guardar cambios', saved: () => vi.mocked(createAdminProduct).mock.calls[0]?.[0] },
    { name: 'admin edit', node: () => <AdminProductEditor productId={product.id} />, cost: /Precio de compra/, save: 'Guardar cambios', saved: () => vi.mocked(updateAdminProduct).mock.calls[0]?.[2] },
    { name: 'supplier purchase', node: () => <SupplierPurchaseFormView supplierId="supplier-1" />, cost: /Costo unitario/, save: 'Registrar compra', saved: () => vi.mocked(registerPurchase).mock.calls[0]?.[1].items[0] },
    { name: 'affiliate create', node: () => <AffiliateListingCreateForm />, cost: null, save: 'Guardar borrador', saved: () => vi.mocked(createAffiliateListing).mock.calls[0]?.[0] },
    { name: 'affiliate edit', node: () => <AffiliateListingEditForm listing={listing} onSaved={vi.fn()} />, cost: null, save: 'Guardar cambios', saved: () => vi.mocked(updateAffiliateListing).mock.calls[0]?.[2] },
  ];

  for (const editor of editors) {
    it(`${editor.name}: selects a card from the last page and resets pagination when reopened`, async () => {
      const search = vi.fn(async (_query: string, page = 1) => ({
        data: [{ ...card, id: `card-page-${page}`, name: page === 1 ? 'Charizard inicial' : 'Charizard final' }],
        meta: { page, limit: 20, total: 21, totalPages: 2 },
      }));
      vi.mocked(searchPokemonTcgCards).mockImplementation(search);
      vi.mocked(searchAffiliatePokemonTcgCards).mockImplementation(search);
      vi.mocked(getPokemonTcgCard).mockResolvedValue(card);
      vi.mocked(getAffiliatePokemonTcgCard).mockResolvedValue(card);
      renderEditor(editor.node());
      fireEvent.click(await screen.findByRole('button', { name: 'Autocompletar con Pokémon TCG' }));
      fireEvent.change(screen.getByLabelText('Nombre o parte del nombre'), { target: { value: 'Charizard' } });
      fireEvent.click(screen.getByRole('button', { name: 'Buscar carta' }));
      await screen.findByRole('button', { name: /Usar carta Charizard inicial/ });
      fireEvent.change(screen.getByLabelText('Nombre o parte del nombre'), { target: { value: 'Pikachu' } });
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
      fireEvent.click(await screen.findByRole('button', { name: /Usar carta Charizard final/ }));
      await waitFor(() => expect(screen.getByLabelText(/^Nombre$/)).toHaveValue('Charizard'));
      expect(search).toHaveBeenLastCalledWith('Charizard', 2, expect.any(AbortSignal));
      const loadCard = editor.name.startsWith('affiliate') ? getAffiliatePokemonTcgCard : getPokemonTcgCard;
      expect(loadCard).toHaveBeenCalledWith('card-page-2');
      fireEvent.click(screen.getByRole('button', { name: 'Autocompletar con Pokémon TCG' }));
      expect(screen.getByLabelText('Nombre o parte del nombre')).toHaveValue('Charizard');
      expect(screen.getByText('Encontrá la versión exacta')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Páginas de resultados' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Buscar carta' }));
      await screen.findByRole('button', { name: /Usar carta Charizard inicial/ });
      expect(search).toHaveBeenCalledTimes(2);
    });

    for (const set of [{ setCode: '30C', setName: '30C', rarity: 'Special illustration rare' }, { setCode: 'MEW', setName: '151', rarity: 'None' }]) {
      it(`${editor.name}: displays and saves API rarity, attribute and ${set.setCode}/${set.setName} as separate set fields`, async () => {
        const selected = { ...card, ...set, types: ['Lightning'] };
        vi.mocked(getPokemonTcgCard).mockResolvedValue(selected);
        vi.mocked(getAffiliatePokemonTcgCard).mockResolvedValue(selected);
        renderEditor(editor.node());
        await selectCard();

        expect(screen.getByRole('combobox', { name: 'Tipo / atributo' })).toHaveValue('LIGHTNING');
        const rarity = screen.getByRole('combobox', { name: /^Rareza$/ });
        expect(rarity.tagName).toBe('SELECT');
        expect(rarity).toHaveValue(set.rarity);
        const collection = screen.getByLabelText('Colección / set');
        if (collection.tagName === 'SELECT') {
          expect(collection).toHaveValue(set.setCode);
          expect(collection).toHaveDisplayValue(set.setName);
          // Reselecting the current code must retain the card's name over a catalog placeholder.
          fireEvent.change(collection, { target: { value: set.setCode } });
        } else {
          expect(collection).toHaveValue(set.setName);
        }
        expect(screen.getByLabelText('Código de set')).toHaveValue(set.setCode);
        expect(screen.getByLabelText('Número')).toHaveValue(card.localId);
        expect(screen.getByLabelText('Idioma')).toHaveValue(card.language);

        fireEvent.click(screen.getByRole('button', { name: editor.save }));
        await waitFor(() => expect(editor.saved()).toEqual(expect.objectContaining({
          ...set, pokemonType: 'LIGHTNING',
          cardNumber: card.localId, language: card.language, price: '123.45',
        })));
      });
    }

    for (const withPrice of [true, false]) {
      it(`${editor.name}: ${withPrice ? 'applies an editable USD reference' : 'preserves price without a USD reference'} and preserves manual details and costs`, async () => {
        const selected = { ...card, marketPrice: withPrice ? card.marketPrice : null };
        vi.mocked(getPokemonTcgCard).mockResolvedValue(selected);
        vi.mocked(getAffiliatePokemonTcgCard).mockResolvedValue(selected);
        renderEditor(editor.node());
        await screen.findByRole('button', { name: 'Autocompletar con Pokémon TCG' });
        const price = screen.getByLabelText(/Precio de venta|Precio en USD/);
        fireEvent.change(price, { target: { value: '77.77' } });
        if (editor.cost) fireEvent.change(screen.getByLabelText(editor.cost), { target: { value: '12.34' } });
        fireEvent.change(screen.getByLabelText(/^Descripción$/), { target: { value: 'Descripción propia' } });
        fireEvent.change(screen.getByLabelText('Tipo / atributo'), { target: { value: 'FIRE' } });
        await screen.findByRole('option', { name: /^Rare$/ });
        fireEvent.change(screen.getByRole('combobox', { name: /^Rareza$/ }), { target: { value: 'Rare' } });
        fireEvent.change(screen.getByLabelText('Acabado / foil'), { target: { value: 'Acabado propio' } });
        fireEvent.change(screen.getByLabelText('Edición'), { target: { value: 'Edición propia' } });
        fireEvent.change(screen.getByLabelText('Condición'), { target: { value: 'PLAYED' } });
        await selectCard();
        expect(price).toHaveValue(withPrice ? 123.45 : 77.77);
        if (editor.cost) expect(screen.getByLabelText(editor.cost)).toHaveValue(12.34);
        expect(screen.getByLabelText(/^Descripción$/)).toHaveValue('Descripción propia');
        expect(screen.getByLabelText('Tipo / atributo')).toHaveValue('FIRE');
        expect(screen.getByRole('combobox', { name: /^Rareza$/ })).toHaveValue('Rare');
        expect(screen.getByLabelText('Acabado / foil')).toHaveValue(withPrice ? 'Holo' : 'Acabado propio');
        expect(screen.getByLabelText('Edición')).toHaveValue('Edición propia');
        expect(screen.getByLabelText('Condición')).toHaveValue('PLAYED');
        expect(screen.getByRole('status')).toHaveTextContent(withPrice ? 'USD 123.45 · tcgplayer · holofoil' : 'Sin referencia de precio en USD');
        if (withPrice) expect(screen.getByRole('status')).toHaveTextContent('actualizado 12/10/2026');
        fireEvent.change(price, { target: { value: '99.99' } });
        expect(price).toHaveValue(99.99);
      });
    }
  }

  it.each(['Trainer', 'Energy'])('does not assign an elemental type to %s cards', (category) => {
    expect({ pokemonType: 'FIRE', ...pokemonTcgAutofill({ ...card, category }) }).toHaveProperty('pokemonType', undefined);
  });

  it('applies the explicit None rarity reported by the provider', () => {
    expect({ rarity: 'Rare', ...pokemonTcgAutofill({ ...card, rarity: 'None' }) }).toHaveProperty('rarity', 'None');
  });

  it('keeps different set codes with the same name distinct', () => {
    const catalog = [{ id: 'SV1', name: 'Promos' }];
    const options = setSelectOptions(catalog, 'Promos', 'SV2');
    expect(options).toEqual([{ id: 'SV2', name: 'Promos' }, { id: 'SV1', name: 'Promos' }]);
    expect(selectedSetId(options, 'Promos', 'SV2')).toBe('SV2');
    expect(selectedSetId(catalog, 'Promos', 'SV2')).toBe('');
  });

  it('clears an existing elemental type when selecting a trainer in the admin editor', async () => {
    vi.mocked(getPokemonTcgCard).mockResolvedValue({ ...card, category: 'Trainer' });
    renderEditor(<AdminProductEditor />);
    fireEvent.change(screen.getByLabelText('Tipo / atributo'), { target: { value: 'FIRE' } });
    await selectCard();
    expect(screen.getByLabelText('Tipo / atributo')).toHaveValue('');
  });

  it('rejects non-USD prices and treats absent or zero references as unavailable', () => {
    expect(pokemonTcgCardSchema.safeParse({ ...card, marketPrice: { ...card.marketPrice, currency: 'EUR' } }).success).toBe(false);
    expect(pokemonTcgCardSchema.parse({ ...card, marketPrice: undefined }).marketPrice).toBeNull();
    expect(pokemonTcgAutofill({ ...card, marketPrice: { ...card.marketPrice!, amountMinor: '0' } })).not.toHaveProperty('price');
  });
});
