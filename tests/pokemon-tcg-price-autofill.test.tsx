import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProductEditor } from '@/features/product-management/ui/admin-product-editor';
import { SupplierPurchaseFormView } from '@/features/supplier-management/ui/supplier-purchase-form';
import { AffiliateListingCreateForm, AffiliateListingEditForm } from '@/features/affiliate/ui/affiliate-listing-editor';
import { adminProductSchema } from '@/features/product-management/domain/contracts';
import { affiliateListingSchema } from '@/features/affiliate/domain/contracts';
import { createAdminProduct, getAdminProduct, getPokemonTcgCard, importPokemonTcgImage, searchPokemonTcgCards, updateAdminProduct } from '@/features/product-management/infrastructure/api';
import { createAffiliateListing, getAffiliatePokemonTcgCard, importAffiliatePokemonTcgImage, searchAffiliatePokemonTcgCards, updateAffiliateListing } from '@/features/affiliate/infrastructure/api';
import { registerPurchase } from '@/features/supplier-management/application';
import type { PokemonTcgCardSummary } from '@/shared/pokemon-tcg/contracts';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/feedback', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/features/product-management/infrastructure/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/product-management/infrastructure/api')>(),
  createAdminProduct: vi.fn(), getAdminProduct: vi.fn(), updateAdminProduct: vi.fn(),
  getPokemonTcgCard: vi.fn(), importPokemonTcgImage: vi.fn(), searchPokemonTcgCards: vi.fn(),
  listPokemonTcgRarities: vi.fn().mockResolvedValue(['Rare']),
  listPokemonTcgSets: vi.fn().mockResolvedValue([{ id: 'BS', name: 'Base Set' }]),
}));
vi.mock('@/features/affiliate/infrastructure/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/affiliate/infrastructure/api')>(),
  createAffiliateListing: vi.fn().mockResolvedValue({ id: 'listing-1', productId: 'product-1' }),
  updateAffiliateListing: vi.fn().mockResolvedValue({ id: 'listing-1', version: 2, status: 'DRAFT' }),
  getAffiliatePokemonTcgCard: vi.fn(), importAffiliatePokemonTcgImage: vi.fn(), searchAffiliatePokemonTcgCards: vi.fn(),
  listAffiliatePokemonTcgRarities: vi.fn().mockResolvedValue(['Rare']),
  listAffiliatePokemonTcgSets: vi.fn().mockResolvedValue([{ id: 'BS', name: 'Base Set' }]),
}));
vi.mock('@/features/supplier-management/application', () => ({
  loadSupplier: vi.fn().mockResolvedValue({ id: 'supplier-1', name: 'Proveedor' }),
  registerPurchase: vi.fn().mockResolvedValue({ items: [] }),
}));

const card: PokemonTcgCardSummary = {
  id: '248', name: 'Charizard', localId: '4', setCode: 'BS', setName: 'Base Set',
  imageUrl: 'https://assets.pokemon-tcg.dev/card.webp', rarity: 'Ultra Rare', category: 'Pokemon', types: ['Fire'],
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

async function applyPrice(trigger: HTMLElement) {
  fireEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Buscar precio de venta' });
  expect(within(dialog).getByLabelText('Nombre o parte del nombre')).toHaveValue('Carta propia');
  fireEvent.change(within(dialog).getByLabelText('Nombre o parte del nombre'), { target: { value: 'Charizard' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Buscar carta' }));
  fireEvent.click(await within(dialog).findByRole('button', { name: 'Usar precio de Charizard, Base Set, número 4' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('Pokémon TCG price-only autofill in every editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const result = { data: [card], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    vi.mocked(searchPokemonTcgCards).mockResolvedValue(result);
    vi.mocked(searchAffiliatePokemonTcgCards).mockResolvedValue(result);
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
    it(`${editor.name}: saves the chosen price without replacing card details, images or cost`, async () => {
      renderEditor(editor.node());
      const trigger = await screen.findByRole('button', { name: 'Buscar precio' });
      fireEvent.change(screen.getByLabelText(/^Nombre$/), { target: { value: 'Carta propia' } });
      fireEvent.change(screen.getByLabelText(/^Descripción$/), { target: { value: 'Descripción propia' } });
      if (screen.queryByLabelText('SKU')) fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'SKU-PROPIO' } });
      if (screen.queryByLabelText('Slug')) fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'carta-propia' } });
      if (editor.cost) fireEvent.change(screen.getByLabelText(editor.cost), { target: { value: '12.34' } });
      fireEvent.change(screen.getByLabelText('Tipo / atributo'), { target: { value: 'WATER' } });
      await screen.findByRole('option', { name: /^Rare$/ });
      fireEvent.change(screen.getByRole('combobox', { name: /^Rareza$/ }), { target: { value: 'Rare' } });
      const collection = screen.getByLabelText('Colección / set');
      fireEvent.change(collection, { target: { value: collection.tagName === 'SELECT' ? 'BS' : 'Base Set' } });
      fireEvent.change(screen.getByLabelText('Código de set'), { target: { value: 'BS' } });
      fireEvent.change(screen.getByLabelText('Número'), { target: { value: '7' } });
      fireEvent.change(screen.getByLabelText('Acabado / foil'), { target: { value: 'Acabado propio' } });
      fireEvent.change(screen.getByLabelText('Edición'), { target: { value: 'Edición propia' } });
      fireEvent.change(screen.getByLabelText('Condición'), { target: { value: 'PLAYED' } });

      await applyPrice(trigger);

      expect(screen.getByLabelText(/Precio de venta|Precio en USD/)).toHaveValue(123.45);
      expect(screen.getByLabelText(/^Nombre$/)).toHaveValue('Carta propia');
      expect(screen.getByLabelText('Tipo / atributo')).toHaveValue('WATER');
      expect(screen.getByRole('combobox', { name: /^Rareza$/ })).toHaveValue('Rare');
      expect(screen.getByLabelText('Acabado / foil')).toHaveValue('Acabado propio');
      expect(screen.getByLabelText('Edición')).toHaveValue('Edición propia');
      expect(screen.getByLabelText('Condición')).toHaveValue('PLAYED');
      if (editor.cost) expect(screen.getByLabelText(editor.cost)).toHaveValue(12.34);
      expect(screen.getByRole('status')).toHaveTextContent('USD 123.45 · tcgplayer · holofoil');
      expect(editor.saved()).toBeUndefined();

      fireEvent.click(screen.getByRole('button', { name: editor.save }));
      await waitFor(() => expect(editor.saved()).toEqual(expect.objectContaining({
        name: 'Carta propia', description: 'Descripción propia', price: '123.45',
        pokemonType: 'WATER', setCode: 'BS', setName: 'Base Set', cardNumber: '7', rarity: 'Rare',
        condition: 'PLAYED', finish: 'Acabado propio', edition: 'Edición propia',
      })));
      const search = editor.name.startsWith('affiliate') ? searchAffiliatePokemonTcgCards : searchPokemonTcgCards;
      expect(search).toHaveBeenCalledWith('Charizard', 1, expect.any(AbortSignal));
      expect(getPokemonTcgCard).not.toHaveBeenCalled();
      expect(getAffiliatePokemonTcgCard).not.toHaveBeenCalled();
      expect(importPokemonTcgImage).not.toHaveBeenCalled();
      expect(importAffiliatePokemonTcgImage).not.toHaveBeenCalled();
    });
  }

  it('supplier: applies the reference to the selected purchase row only', async () => {
    renderEditor(<SupplierPurchaseFormView supplierId="supplier-1" />);
    await screen.findByRole('button', { name: 'Buscar precio' });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar línea' }));
    fireEvent.change(screen.getAllByLabelText(/^Nombre$/)[1], { target: { value: 'Carta propia' } });
    fireEvent.change(screen.getAllByLabelText(/Precio de venta/)[0], { target: { value: '77.77' } });
    fireEvent.change(screen.getAllByLabelText(/Costo unitario/)[1], { target: { value: '12.34' } });

    await applyPrice(screen.getAllByRole('button', { name: 'Buscar precio' })[1]);

    expect(screen.getAllByLabelText(/Precio de venta/)[0]).toHaveValue(77.77);
    expect(screen.getAllByLabelText(/Precio de venta/)[1]).toHaveValue(123.45);
    expect(screen.getAllByLabelText(/Costo unitario/)[1]).toHaveValue(12.34);
    expect(screen.getAllByLabelText(/^Nombre$/)[1]).toHaveValue('Carta propia');
  });
});
