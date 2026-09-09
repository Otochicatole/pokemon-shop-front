import { describe, expect, it } from 'vitest';
import { catalogFiltersEnvelopeSchema, productSchema, optionsSchema } from '@/shared/api/contracts';
import { cartTotal } from '@/features/cart/domain/cart';

const product = { id: 'p1', sku: 'SKU-1', slug: 'card-one', name: 'Card one', description: 'A card', kind: 'SINGLE_CARD' as const, stockMode: 'UNIQUE' as const, price: { amountMinor: '125000', currency: 'ARS' as const }, available: 2, productVersion: 3, images: [] };
describe('frontend contracts', () => {
  it('parses backend products and keeps money as minor-unit strings', () => { expect(productSchema.parse(product).price.amountMinor).toBe('125000'); });
  it('rejects malformed products', () => { expect(() => productSchema.parse({ ...product, price: { amountMinor: 10, currency: 'ARS' } })).toThrow(); });
  it('calculates cart totals without floating point rounding', () => { expect(cartTotal([{ ...product, quantity: 2 }])).toBe(250000n); });
  it('parses checkout options', () => { expect(optionsSchema.parse({ fulfillment: { shippingZones: [], pickupPoints: [] }, paymentMethods: { BANK_TRANSFER: true, MERCADO_PAGO: false } }).paymentMethods.BANK_TRANSFER).toBe(true); });
  it('parses catalog facets and elemental card attributes', () => {
    const card = productSchema.parse({ ...product, pokemonCard: { setName: 'Base Set', setCode: 'BS', cardNumber: '4/102', rarity: 'Rare Holo', language: 'EN', condition: 'NM', pokemonType: 'FIRE', finish: 'Holo', edition: 'Unlimited', gradingCompany: null, grade: null, certificationNumber: null } });
    const facets = catalogFiltersEnvelopeSchema.parse({ data: { totalProducts: 1, kinds: [{ value: 'SINGLE_CARD', count: 1 }], pokemonTypes: [{ value: 'FIRE', count: 1 }], sets: [], rarities: [], conditions: [], languages: [], finishes: [], editions: [], gradingCompanies: [], priceRange: { minMinor: '125000', maxMinor: '125000' } }, meta: {} });
    expect(card.pokemonCard?.pokemonType).toBe('FIRE');
    expect(facets.data.pokemonTypes[0]?.value).toBe('FIRE');
  });
});
