import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AffiliateListingCreateForm, AffiliateListingEditForm } from '@/features/affiliate/ui/affiliate-listing-editor';
import type { AffiliateListing } from '@/features/affiliate/domain/contracts';
import {
  createAffiliateListing,
  updateAffiliateListing,
} from '@/features/affiliate/infrastructure/api';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/features/affiliate/infrastructure/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/affiliate/infrastructure/api')>();
  return {
    ...actual,
    createAffiliateListing: vi.fn(),
    updateAffiliateListing: vi.fn(),
    submitAffiliateListing: vi.fn(),
    uploadAffiliateImages: vi.fn(),
    importAffiliateTcgdexImage: vi.fn(),
    searchAffiliateTcgdexCards: vi.fn(),
    getAffiliateTcgdexCard: vi.fn(),
    reorderAffiliateImages: vi.fn(),
    updateAffiliateImage: vi.fn(),
    deleteAffiliateImage: vi.fn(),
  };
});

vi.mock('@/components/feedback', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const listing: AffiliateListing = {
  id: '11111111-1111-1111-1111-111111111111',
  status: 'DRAFT',
  reviewNote: null,
  submittedAt: null,
  reviewedAt: null,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  product: {
    id: '22222222-2222-2222-2222-222222222222',
    sku: 'AFF-001',
    slug: 'charizard-vmax',
    name: 'Charizard VMAX',
    description: 'Carta en excelente estado',
    kind: 'SINGLE_CARD',
    stockMode: 'UNIQUE',
    priceMinor: '1500',
    status: 'DRAFT',
    version: 3,
    inventory: { onHand: 1, reserved: 0, available: 1, version: 1 },
    pokemonCard: {
      pokemonType: 'FIRE',
      setName: 'Darkness Ablaze',
      setCode: 'DAA',
      cardNumber: '020',
      rarity: 'Ultra Rare',
      language: 'Español',
      condition: 'NM',
      finish: 'Holo',
      edition: null,
      gradingCompany: null,
      grade: null,
      certificationNumber: null,
    },
    images: [],
    listing: null,
    createdAt: '2026-09-16T12:00:00.000Z',
    updatedAt: '2026-09-16T12:00:00.000Z',
  },
};

function renderWithClient(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function fillRequiredCardFields() {
  fireEvent.change(screen.getByLabelText(/^Nombre$/i), { target: { value: 'Pikachu V' } });
  fireEvent.change(screen.getByLabelText(/^Descripción$/i), { target: { value: 'Carta lista para publicar' } });
  fireEvent.change(screen.getByLabelText(/Precio en USD/i), { target: { value: '24.50' } });
  fireEvent.change(screen.getByLabelText(/Colección \/ set/i), { target: { value: 'Sword & Shield' } });
  fireEvent.change(screen.getByLabelText(/^Número$/i), { target: { value: '043' } });
  fireEvent.change(screen.getByLabelText(/^Rareza$/i), { target: { value: 'Rare' } });
  fireEvent.change(screen.getByLabelText(/^Idioma$/i), { target: { value: 'Español' } });
}

describe('affiliate listing editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets the user edit the price and create a draft with that price', async () => {
    vi.mocked(createAffiliateListing).mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      productId: '44444444-4444-4444-4444-444444444444',
    });

    renderWithClient(<AffiliateListingCreateForm />);
    fillRequiredCardFields();
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(createAffiliateListing).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Pikachu V',
        price: '24.50',
        setName: 'Sword & Shield',
        cardNumber: '043',
      }));
    });
    expect(push).toHaveBeenCalledWith('/affiliate/listings/33333333-3333-3333-3333-333333333333');
  });

  it('updates an existing listing with the edited price when saving', async () => {
    vi.mocked(updateAffiliateListing).mockResolvedValue({
      id: listing.id,
      version: 4,
      status: 'DRAFT',
    });
    const onSaved = vi.fn();

    renderWithClient(<AffiliateListingEditForm listing={listing} onSaved={onSaved} />);

    const priceInput = screen.getByLabelText(/Precio en USD/i);
    expect(priceInput).toHaveValue(15);
    fireEvent.change(priceInput, { target: { value: '42.99' } });
    expect(priceInput).toHaveValue(42.99);

    fireEvent.change(screen.getByLabelText(/^Nombre$/i), { target: { value: 'Charizard VMAX Shine' } });
    expect(screen.getByLabelText(/^Nombre$/i)).toHaveValue('Charizard VMAX Shine');
    fireEvent.change(screen.getByLabelText(/Colección \/ set/i), { target: { value: 'Champions Path' } });
    expect(screen.getByLabelText(/Colección \/ set/i)).toHaveValue('Champions Path');

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(updateAffiliateListing).toHaveBeenCalledWith(
        listing.id,
        3,
        expect.objectContaining({
          price: '42.99',
          name: 'Charizard VMAX Shine',
          setName: 'Champions Path',
        }),
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('keeps typed field values after a parent listing refetch with the same id', async () => {
    const onSaved = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <AffiliateListingEditForm listing={listing} onSaved={onSaved} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText(/^Nombre$/i), { target: { value: 'Nombre editado local' } });
    fireEvent.change(screen.getByLabelText(/Precio en USD/i), { target: { value: '99.10' } });

    view.rerender(
      <QueryClientProvider client={client}>
        <AffiliateListingEditForm
          listing={{
            ...listing,
            updatedAt: '2026-09-16T13:00:00.000Z',
            product: { ...listing.product, version: 3, name: 'Charizard VMAX', priceMinor: '1500' },
          }}
          onSaved={onSaved}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText(/^Nombre$/i)).toHaveValue('Nombre editado local');
    expect(screen.getByLabelText(/Precio en USD/i)).toHaveValue(99.1);
  });

  it('shows feedback instead of doing nothing when price is missing', async () => {
    const { toast } = await import('@/components/feedback');
    renderWithClient(<AffiliateListingCreateForm />);

    fireEvent.change(screen.getByLabelText(/^Nombre$/i), { target: { value: 'Pikachu V' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(createAffiliateListing).not.toHaveBeenCalled();
  });
});

describe('notification reference nullability', () => {
  it('accepts notifications whose reference is null', async () => {
    const { notificationSchema } = await import('@/features/notifications/domain/contracts');
    const parsed = notificationSchema.parse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'AFFILIATE_LISTING_REVIEWED',
      title: 'Publicación revisada',
      message: 'Tu publicación fue revisada',
      readAt: null,
      createdAt: '2026-09-16T12:00:00.000Z',
      reference: null,
    });
    expect(parsed.reference).toBeNull();
  });
});
