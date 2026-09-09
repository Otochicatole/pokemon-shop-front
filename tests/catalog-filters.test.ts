import { describe, expect, it } from 'vitest';
import { activeCatalogFilterCount, arsToMinor, buildCatalogApiParams, catalogFiltersToSearchParams, parseCatalogFilters, toggleCatalogFilter, validateCatalogPriceRange } from '@/features/catalog/application/catalog-filter-codec';

describe('catalog filter codec', () => {
  it('parses repeated and comma-separated facets while discarding invalid enum values', () => {
    const params = new URLSearchParams('kind=SINGLE_CARD&kind=ACCESSORY&pokemonType=FIRE,WATER&condition=NM&condition=INVALID&sort=PRICE_ASC');
    const filters = parseCatalogFilters(params);

    expect(filters.kinds).toEqual(['SINGLE_CARD', 'ACCESSORY']);
    expect(filters.pokemonTypes).toEqual(['FIRE', 'WATER']);
    expect(filters.conditions).toEqual(['NM']);
    expect(filters.sort).toBe('PRICE_ASC');
  });

  it('keeps a canonical shareable URL and converts displayed ARS to minor units for the API', () => {
    const filters = parseCatalogFilters(new URLSearchParams('q=dragon&rarity=Ultra+Rare&inStock=true&minPrice=1250.50&maxPrice=3000'));
    const browserParams = catalogFiltersToSearchParams(filters);
    const apiParams = buildCatalogApiParams(filters, '11111111-1111-4111-8111-111111111111');

    expect(browserParams.get('minPrice')).toBe('1250.50');
    expect(apiParams.get('minPrice')).toBeNull();
    expect(apiParams.get('minPriceMinor')).toBe('125050');
    expect(apiParams.get('maxPriceMinor')).toBe('300000');
    expect(apiParams.get('cursor')).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('toggles independent values without removing filters from other groups', () => {
    const initial = parseCatalogFilters(new URLSearchParams('kind=SINGLE_CARD&language=ES'));
    const withFire = toggleCatalogFilter(initial, 'pokemonTypes', 'FIRE');
    const withoutCard = toggleCatalogFilter(withFire, 'kinds', 'SINGLE_CARD');

    expect(withoutCard.kinds).toEqual([]);
    expect(withoutCard.pokemonTypes).toEqual(['FIRE']);
    expect(withoutCard.languages).toEqual(['ES']);
    expect(activeCatalogFilterCount(withoutCard)).toBe(2);
  });

  it('handles decimal ARS precisely without floating-point arithmetic', () => {
    expect(arsToMinor('0.01')).toBe('1');
    expect(arsToMinor('999999999999.99')).toBe('99999999999999');
    expect(arsToMinor('precio')).toBeNull();
  });

  it('preserves explicit negative stock and grading filters', () => {
    const filters = parseCatalogFilters(new URLSearchParams('inStock=false&graded=false'));
    const encoded = catalogFiltersToSearchParams(filters);

    expect(filters.inStock).toBe(false);
    expect(filters.graded).toBe(false);
    expect(encoded.get('inStock')).toBe('false');
    expect(encoded.get('graded')).toBe('false');
    expect(activeCatalogFilterCount(filters)).toBe(2);
  });

  it('validates and normalizes the price range before querying', () => {
    expect(validateCatalogPriceRange('1.250,50', '2000')).toEqual({ success: false, error: 'Ingresá un precio mínimo válido, con hasta dos decimales.' });
    expect(validateCatalogPriceRange('2000', '1000')).toEqual({ success: false, error: 'El precio mínimo no puede superar al máximo.' });
    expect(validateCatalogPriceRange('1250,50', '2000')).toEqual({ success: true, minPrice: '1250.50', maxPrice: '2000' });
  });

  it('canonicalizes facet order and enforces the backend collection limits', () => {
    const repeated = new URLSearchParams();
    for (let index = 24; index >= 0; index -= 1) repeated.append('rarity', `Rare ${String(index).padStart(2, '0')}`);
    const filters = parseCatalogFilters(repeated);
    const encoded = catalogFiltersToSearchParams(filters);

    expect(filters.rarities).toHaveLength(20);
    expect(encoded.getAll('rarity')).toEqual([...filters.rarities].sort());
  });
});
