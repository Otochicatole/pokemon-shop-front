import type { PokemonType, ProductCondition, ProductKind } from '@/shared/api/contracts';

export const catalogSorts = ['NEWEST', 'PRICE_ASC', 'PRICE_DESC', 'NAME_ASC'] as const;
export type CatalogSort = (typeof catalogSorts)[number];
export type CatalogArrayFilterKey = 'kinds' | 'pokemonTypes' | 'setNames' | 'rarities' | 'conditions' | 'languages' | 'finishes' | 'editions' | 'gradingCompanies';

export interface CatalogFilterState {
  q: string;
  kinds: ProductKind[];
  pokemonTypes: PokemonType[];
  setNames: string[];
  setCode: string;
  rarities: string[];
  conditions: ProductCondition[];
  languages: string[];
  finishes: string[];
  editions: string[];
  gradingCompanies: string[];
  graded: boolean | null;
  inStock: boolean | null;
  minPrice: string;
  maxPrice: string;
  sort: CatalogSort;
}

export const emptyCatalogFilters: CatalogFilterState = {
  q: '',
  kinds: [],
  pokemonTypes: [],
  setNames: [],
  setCode: '',
  rarities: [],
  conditions: [],
  languages: [],
  finishes: [],
  editions: [],
  gradingCompanies: [],
  graded: null,
  inStock: null,
  minPrice: '',
  maxPrice: '',
  sort: 'NEWEST',
};

export const productKindLabels: Record<ProductKind, string> = {
  SINGLE_CARD: 'Cartas individuales',
  SEALED_PRODUCT: 'Productos sellados',
  ACCESSORY: 'Accesorios',
};

export const pokemonTypeLabels: Record<PokemonType, string> = {
  COLORLESS: 'Incoloro',
  DARKNESS: 'Oscuridad',
  DRAGON: 'Dragón',
  FAIRY: 'Hada',
  FIGHTING: 'Lucha',
  FIRE: 'Fuego',
  GRASS: 'Planta',
  LIGHTNING: 'Eléctrico',
  METAL: 'Metal',
  PSYCHIC: 'Psíquico',
  WATER: 'Agua',
};

export const conditionLabels: Record<ProductCondition, string> = {
  NM: 'Near Mint',
  EXCELLENT: 'Excelente',
  GOOD: 'Buena',
  PLAYED: 'Jugadas',
  DAMAGED: 'Dañadas',
};

export const sortLabels: Record<CatalogSort, string> = {
  NEWEST: 'Más recientes',
  PRICE_ASC: 'Menor precio',
  PRICE_DESC: 'Mayor precio',
  NAME_ASC: 'Nombre A–Z',
};
