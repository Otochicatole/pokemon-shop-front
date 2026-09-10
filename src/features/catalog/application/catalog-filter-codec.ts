import { catalogSorts, emptyCatalogFilters, type CatalogArrayFilterKey, type CatalogFilterState, type CatalogSort } from '../domain/catalog-filters';
import { pokemonTypeSchema, productConditionSchema, productKindSchema } from '@/shared/api/contracts';

type SearchParamsReader = Pick<URLSearchParams, 'get' | 'getAll'>;
const maxPriceMinor = 9_223_372_036_854_775_807n;
const queryNames: Record<CatalogArrayFilterKey, string> = {
  kinds: 'kind',
  pokemonTypes: 'pokemonType',
  setNames: 'setName',
  rarities: 'rarity',
  conditions: 'condition',
  languages: 'language',
  finishes: 'finish',
  editions: 'edition',
  gradingCompanies: 'gradingCompany',
};

function readMany(params: SearchParamsReader, name: string, maxItems: number, maxLength: number): string[] {
  return [...new Set(params.getAll(name)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= maxLength))]
    .slice(0, maxItems);
}

function readDecimal(value: string | null): string {
  if (!value) return '';
  const normalized = value.trim().replace(',', '.');
  return /^\d{1,16}(?:\.\d{1,2})?$/.test(normalized) ? normalized : '';
}

function readOptionalBoolean(value: string | null): boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

export function usdToMinor(value: string): string | null {
  const normalized = readDecimal(value);
  if (!normalized) return null;
  const [whole = '0', decimals = ''] = normalized.split('.');
  const minor = BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'));
  return minor <= maxPriceMinor ? minor.toString() : null;
}

export function minorToUsd(value: string | null): string {
  if (value === null || !/^\d+$/.test(value)) return '';
  const minor = BigInt(value);
  const decimals = (minor % 100n).toString().padStart(2, '0');
  return decimals === '00' ? (minor / 100n).toString() : `${minor / 100n}.${decimals}`;
}

export type CatalogPriceRangeResult =
  | { success: true; minPrice: string; maxPrice: string }
  | { success: false; error: string };

export function validateCatalogPriceRange(minInput: string, maxInput: string): CatalogPriceRangeResult {
  const minPrice = readDecimal(minInput);
  const maxPrice = readDecimal(maxInput);
  if (minInput.trim() && !minPrice) return { success: false, error: 'Ingresá un precio mínimo válido, con hasta dos decimales.' };
  if (maxInput.trim() && !maxPrice) return { success: false, error: 'Ingresá un precio máximo válido, con hasta dos decimales.' };
  const minMinor = minPrice ? usdToMinor(minPrice) : null;
  const maxMinor = maxPrice ? usdToMinor(maxPrice) : null;
  if ((minPrice && minMinor === null) || (maxPrice && maxMinor === null)) return { success: false, error: 'El precio supera el máximo permitido.' };
  if (minMinor !== null && maxMinor !== null && BigInt(minMinor) > BigInt(maxMinor)) {
    return { success: false, error: 'El precio mínimo no puede superar al máximo.' };
  }
  return { success: true, minPrice, maxPrice };
}

export function parseCatalogFilters(params: SearchParamsReader): CatalogFilterState {
  const kinds = readMany(params, 'kind', 3, 30).flatMap((value) => {
    const parsed = productKindSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
  const pokemonTypes = readMany(params, 'pokemonType', 11, 30).flatMap((value) => {
    const parsed = pokemonTypeSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
  const conditions = readMany(params, 'condition', 5, 30).flatMap((value) => {
    const parsed = productConditionSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
  const sortValue = params.get('sort');
  const sort = catalogSorts.includes(sortValue as CatalogSort) ? sortValue as CatalogSort : emptyCatalogFilters.sort;

  return {
    q: (params.get('q') ?? '').trim().slice(0, 100),
    kinds,
    pokemonTypes,
    setNames: readMany(params, 'setName', 20, 100),
    setCode: (params.get('setCode') ?? '').trim().slice(0, 40),
    rarities: readMany(params, 'rarity', 20, 80),
    conditions,
    languages: readMany(params, 'language', 20, 40),
    finishes: readMany(params, 'finish', 20, 50),
    editions: readMany(params, 'edition', 20, 80),
    gradingCompanies: readMany(params, 'gradingCompany', 20, 80),
    graded: readOptionalBoolean(params.get('graded')),
    inStock: readOptionalBoolean(params.get('inStock')),
    minPrice: readDecimal(params.get('minPrice')),
    maxPrice: readDecimal(params.get('maxPrice')),
    sort,
  };
}

export function catalogFiltersToSearchParams(filters: CatalogFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  for (const [key, name] of Object.entries(queryNames) as Array<[CatalogArrayFilterKey, string]>) {
    for (const value of [...filters[key]].sort((left, right) => left.localeCompare(right))) params.append(name, value);
  }
  if (filters.setCode) params.set('setCode', filters.setCode);
  if (filters.graded !== null) params.set('graded', String(filters.graded));
  if (filters.inStock !== null) params.set('inStock', String(filters.inStock));
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.sort !== emptyCatalogFilters.sort) params.set('sort', filters.sort);
  return params;
}

export function buildCatalogApiParams(filters: CatalogFilterState, cursor?: string | null): URLSearchParams {
  const params = catalogFiltersToSearchParams(filters);
  const minPriceMinor = usdToMinor(filters.minPrice);
  const maxPriceMinor = usdToMinor(filters.maxPrice);
  params.delete('minPrice');
  params.delete('maxPrice');
  if (minPriceMinor !== null) params.set('minPriceMinor', minPriceMinor);
  if (maxPriceMinor !== null) params.set('maxPriceMinor', maxPriceMinor);
  params.set('limit', '24');
  if (cursor) params.set('cursor', cursor);
  return params;
}

export function toggleCatalogFilter(filters: CatalogFilterState, key: CatalogArrayFilterKey, value: string): CatalogFilterState {
  const current = filters[key] as string[];
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  return { ...filters, [key]: next } as CatalogFilterState;
}

export function activeCatalogFilterCount(filters: CatalogFilterState): number {
  return Object.keys(queryNames).reduce((count, key) => count + filters[key as CatalogArrayFilterKey].length, 0)
    + Number(filters.setCode !== '')
    + Number(filters.graded !== null)
    + Number(filters.inStock !== null)
    + Number(filters.minPrice !== '')
    + Number(filters.maxPrice !== '');
}

export function hasCatalogFilters(filters: CatalogFilterState): boolean {
  return activeCatalogFilterCount(filters) > 0 || filters.q !== '';
}
