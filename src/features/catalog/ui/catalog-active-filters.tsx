import { X } from 'lucide-react';
import type { CatalogFilters } from '@/shared/api/contracts';
import { conditionLabels, pokemonTypeLabels, productKindLabels, type CatalogArrayFilterKey, type CatalogFilterState } from '../domain/catalog-filters';

interface CatalogActiveFiltersProps {
  filters: CatalogFilterState;
  facets?: CatalogFilters;
  onChange: (next: CatalogFilterState) => void;
  onClear: () => void;
}

const arrayFilters: Array<{ key: CatalogArrayFilterKey; label: string }> = [
  { key: 'kinds', label: 'Producto' },
  { key: 'pokemonTypes', label: 'Tipo' },
  { key: 'setNames', label: 'Set' },
  { key: 'rarities', label: 'Rareza' },
  { key: 'conditions', label: 'Condición' },
  { key: 'languages', label: 'Idioma' },
  { key: 'finishes', label: 'Acabado' },
  { key: 'editions', label: 'Edición' },
  { key: 'gradingCompanies', label: 'Grading' },
];

export function CatalogActiveFilters({ filters, facets, onChange, onClear }: CatalogActiveFiltersProps) {
  const dynamicLabels = new Map(
    [facets?.sets, facets?.rarities, facets?.languages, facets?.finishes, facets?.editions, facets?.gradingCompanies]
      .flatMap((options) => options ?? [])
      .map((option) => [option.value, option.value]),
  );
  const labels: Record<string, string> = { ...productKindLabels, ...pokemonTypeLabels, ...conditionLabels, ...Object.fromEntries(dynamicLabels) };
  const chips: Array<{ id: string; text: string; remove: () => void }> = [];

  if (filters.q) chips.push({ id: 'q', text: `Búsqueda: ${filters.q}`, remove: () => onChange({ ...filters, q: '' }) });
  for (const group of arrayFilters) {
    for (const value of filters[group.key] as string[]) {
      chips.push({
        id: `${group.key}-${value}`,
        text: `${group.label}: ${labels[value] ?? value}`,
        remove: () => onChange({ ...filters, [group.key]: filters[group.key].filter((item) => item !== value) } as CatalogFilterState),
      });
    }
  }
  if (filters.setCode) chips.push({ id: 'setCode', text: `Código: ${filters.setCode}`, remove: () => onChange({ ...filters, setCode: '' }) });
  if (filters.inStock !== null) chips.push({ id: 'inStock', text: filters.inStock ? 'Con stock' : 'Sin stock', remove: () => onChange({ ...filters, inStock: null }) });
  if (filters.graded !== null) chips.push({ id: 'graded', text: filters.graded ? 'Graduadas' : 'Sin graduar', remove: () => onChange({ ...filters, graded: null }) });
  if (filters.minPrice) chips.push({ id: 'minPrice', text: `Desde $${filters.minPrice}`, remove: () => onChange({ ...filters, minPrice: '' }) });
  if (filters.maxPrice) chips.push({ id: 'maxPrice', text: `Hasta $${filters.maxPrice}`, remove: () => onChange({ ...filters, maxPrice: '' }) });

  if (chips.length === 0) return null;

  return (
    <div className="catalog-active-filters" aria-label="Filtros aplicados">
      <span>Filtros activos</span>
      <div>
        {chips.map((chip) => <button type="button" key={chip.id} onClick={chip.remove}>{chip.text}<X size={12} aria-hidden="true" /><span className="sr-only">Quitar filtro</span></button>)}
        {chips.length > 1 && <button type="button" className="catalog-clear-all" onClick={onClear}>Limpiar todo</button>}
      </div>
    </div>
  );
}
