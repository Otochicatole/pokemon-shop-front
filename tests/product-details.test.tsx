import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDetails } from '@/app/(store)/products/[slug]/product-details';
import type { Product } from '@/shared/api/contracts';
import { useCartStore } from '@/features/cart/infrastructure/store';

vi.mock('@/app/(store)/products/[slug]/product-image-gallery', () => ({
  ProductImageGallery: ({ productName }: { productName: string }) => <div role="img" aria-label={productName} />,
}));
vi.mock('@/shared/fx/StorefrontFxProvider', () => ({
  useStorefrontFx: () => ({ formatMoney: () => '—', isLoading: false }),
}));
vi.mock('@/components/feedback', () => ({ toast: { success: vi.fn() } }));

const product: Product = {
  id: 'bulbasaur-id', sku: 'TCG-17373', slug: 'bulbasaur-17373', name: 'Bulbasaur',
  description: 'Carta conservada en funda. Fotografías de frente y reverso.',
  kind: 'SINGLE_CARD', stockMode: 'UNIQUE', price: { amountMinor: '1196', currency: 'USD' },
  available: 1, productVersion: 3, images: [], updatedAt: '2026-10-13T02:22:46.395Z',
  seller: { type: 'STORE', id: null, name: 'Card Shop' },
  pokemonCard: {
    setName: 'Crystal Guardians', setCode: 'CG', cardNumber: '45', rarity: 'Common',
    language: 'Inglés', condition: 'NM', pokemonType: 'GRASS', finish: 'Normal',
    edition: 'Unlimited', gradingCompany: 'PSA', grade: '9', certificationNumber: '12345678',
  },
};

function expectDetail(regionName: string, label: string, value: string) {
  const region = screen.getByRole('region', { name: regionName });
  const term = within(region).getByText(label, { selector: 'dt' });
  expect(term.nextElementSibling).toHaveTextContent(value);
}

beforeEach(() => useCartStore.getState().clear());
afterEach(() => {
  cleanup();
  useCartStore.getState().clear();
});

describe('public product details', () => {
  it('shows every persisted card attribute with separate collection and set code', () => {
    render(<ProductDetails product={product} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Bulbasaur' })).toBeInTheDocument();
    const details = [
      ['Detalles de la carta', 'Colección / set', 'Crystal Guardians'],
      ['Detalles de la carta', 'Código de set', 'CG'],
      ['Detalles de la carta', 'Número de carta', '45'],
      ['Detalles de la carta', 'Rareza', 'Common'],
      ['Detalles de la carta', 'Tipo / atributo', 'Planta'],
      ['Detalles de la carta', 'Idioma', 'Inglés'],
      ['Estado y edición', 'Condición', 'Near Mint (NM)'],
      ['Estado y edición', 'Acabado / foil', 'Normal'],
      ['Estado y edición', 'Edición', 'Unlimited'],
      ['Certificación y grading', 'Empresa de grading', 'PSA'],
      ['Certificación y grading', 'Grado', '9'],
      ['Certificación y grading', 'Número de certificación', '12345678'],
    ];
    for (const [region, label, value] of details) expectDetail(region, label, value);
    expectDetail('Datos de la publicación', 'SKU', 'TCG-17373');
    expect(screen.getByText(product.description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar esta colección' })).toHaveAttribute('href', '/catalog?setCode=CG');
    expect(screen.getByText('12 de octubre de 2026')).toHaveAttribute('datetime', product.updatedAt);
  });

  it('keeps a reported grade and certificate visible when the grading company is missing', () => {
    render(<ProductDetails product={{ ...product, pokemonCard: { ...product.pokemonCard!, gradingCompany: null } }} />);

    expectDetail('Certificación y grading', 'Empresa de grading', 'No informado');
    expectDetail('Certificación y grading', 'Grado', '9');
    expectDetail('Certificación y grading', 'Número de certificación', '12345678');
    expect(screen.queryByText(/no informó datos de certificación/)).not.toBeInTheDocument();
  });

  it('distinguishes missing information from a confirmed edition or certification status', () => {
    render(<ProductDetails product={{
      ...product, description: '  ', updatedAt: 'not-a-date',
      pokemonCard: {
        ...product.pokemonCard!, setName: '', setCode: null, cardNumber: '', rarity: '', language: '',
        pokemonType: null, finish: null, edition: null, gradingCompany: null, grade: null, certificationNumber: null,
      },
    }} />);

    for (const label of ['Colección / set', 'Código de set', 'Número de carta', 'Rareza', 'Tipo / atributo', 'Idioma']) {
      expectDetail('Detalles de la carta', label, 'No informado');
    }
    expectDetail('Estado y edición', 'Edición', 'No informado');
    expectDetail('Estado y edición', 'Acabado / foil', 'No informado');
    expect(screen.getByText('El vendedor no informó datos de certificación para esta carta.')).toBeInTheDocument();
    expect(screen.getByText('El vendedor todavía no agregó una descripción para este producto.')).toBeInTheDocument();
    expect(screen.queryByText(/sin certificar|edición estándar/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Explorar esta colección' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Publicación actualizada/)).not.toBeInTheDocument();
  });

  it('shows sealed-product information without card-only sections', () => {
    render(<ProductDetails product={{
      ...product, name: 'Elite Trainer Box', kind: 'SEALED_PRODUCT', stockMode: 'QUANTITY', pokemonCard: null,
    }} />);

    expectDetail('Detalles', 'Tipo de producto', 'Producto sellado');
    expectDetail('Datos de la publicación', 'Modalidad de venta', 'Por cantidad');
    expect(screen.queryByRole('region', { name: 'Detalles de la carta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Estado y edición' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Certificación y grading' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeEnabled();
  });

  it('prevents adding sold-out products and offers a route back to available products', async () => {
    const user = userEvent.setup();
    render(<ProductDetails product={{ ...product, available: 0 }} />);

    const addButton = screen.getByRole('button', { name: 'Sin stock' });
    expect(addButton).toBeDisabled();
    await user.click(addButton);
    expect(useCartStore.getState().items).toEqual([]);
    expectDetail('Datos de la publicación', 'Disponibilidad', 'Sin stock disponible');
    expect(screen.getByRole('link', { name: 'Ver productos disponibles' })).toHaveAttribute('href', '/catalog');
  });

  it('uses the correct singular and plural availability for the purchase and listing', () => {
    const { rerender } = render(<ProductDetails product={product} />);
    expect(screen.getAllByText('1 unidad disponible')).toHaveLength(2);
    expect(screen.queryByText('1 unidades disponibles')).not.toBeInTheDocument();

    rerender(<ProductDetails product={{ ...product, available: 4 }} />);
    expect(screen.getAllByText('4 unidades disponibles')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeEnabled();
  });

  it('identifies the affiliate seller and uses the collection name only when a code is absent', () => {
    render(<ProductDetails product={{
      ...product, seller: { type: 'AFFILIATE', id: 'affiliate-id', name: 'Mazo Norte' },
      pokemonCard: { ...product.pokemonCard!, setName: 'Scarlet & Violet', setCode: null },
    }} />);

    expectDetail('Datos de la publicación', 'Vendedor', 'Mazo Norte');
    expectDetail('Datos de la publicación', 'Tipo de vendedor', 'Vendedor afiliado');
    expect(screen.getByRole('link', { name: 'Explorar esta colección' })).toHaveAttribute('href', '/catalog?setName=Scarlet%20%26%20Violet');
    expect(screen.getByText(/Dependen del vendedor y de tu ubicación/)).toBeInTheDocument();
    expect(screen.queryByText('Envíos a todo el país')).not.toBeInTheDocument();
  });
});
