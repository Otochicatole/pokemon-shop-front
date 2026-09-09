'use client';

import { useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/button';
import type { CatalogFacetOption, CatalogFilters } from '@/shared/api/contracts';
import { minorToArs, validateCatalogPriceRange } from '../application/catalog-filter-codec';
import {
  conditionLabels,
  pokemonTypeLabels,
  productKindLabels,
  type CatalogArrayFilterKey,
  type CatalogFilterState,
} from '../domain/catalog-filters';

interface CatalogFilterPanelProps {
  filters: CatalogFilterState;
  facets?: CatalogFilters;
  onToggle: (key: CatalogArrayFilterKey, value: string) => void;
  onChange: (next: CatalogFilterState) => void;
  onClear: () => void;
  labelledBy?: string;
}

interface FacetGroupProps {
  label: string;
  filterKey: CatalogArrayFilterKey;
  options: CatalogFacetOption[];
  selected: string[];
  onToggle: CatalogFilterPanelProps['onToggle'];
  labels?: Record<string, string>;
  typeDots?: boolean;
  initiallyOpen?: boolean;
}

const fallbackKinds = Object.keys(productKindLabels).map((value) => ({ value, count: 0 }));
const fallbackPokemonTypes = Object.keys(pokemonTypeLabels).map((value) => ({ value, count: 0 }));
const fallbackConditions = Object.keys(conditionLabels).map((value) => ({ value, count: 0 }));

function includeSelected(options: CatalogFacetOption[], selected: string[]): CatalogFacetOption[] {
  const known = new Set(options.map((option) => option.value));
  return [...options, ...selected.filter((value) => !known.has(value)).map((value) => ({ value, count: 0 }))];
}

function FacetGroup({ label, filterKey, options, selected, onToggle, labels, typeDots = false, initiallyOpen = false }: FacetGroupProps) {
  if (options.length === 0 && selected.length === 0) return null;

  return (
    <details className="catalog-filter-group" open={initiallyOpen || selected.length > 0}>
      <summary>{label}<span>{selected.length || ''}</span></summary>
      <fieldset>
        <legend className="sr-only">{label}</legend>
        {includeSelected(options, selected).map((option) => (
          <button
            type="button"
            className="catalog-filter-option"
            aria-pressed={selected.includes(option.value)}
            key={option.value}
            onClick={() => onToggle(filterKey, option.value)}
          >
            <span className="catalog-filter-marker" aria-hidden="true">{selected.includes(option.value) ? '◆' : '◇'}</span>
            {typeDots && <i className={`catalog-type-dot type-${option.value.toLowerCase()}`} aria-hidden="true" />}
            <span>{labels?.[option.value] ?? option.value}</span>
            {(option.count > 0 || options.some((item) => item.count > 0)) && <small>{option.count}</small>}
          </button>
        ))}
      </fieldset>
    </details>
  );
}

export function CatalogFilterPanel({ filters, facets, onToggle, onChange, onClear, labelledBy }: CatalogFilterPanelProps) {
  const id = useId();

  return (
    <div className="catalog-filter-panel" aria-labelledby={labelledBy}>
      <div className="catalog-filter-panel-heading">
        <div><span aria-hidden="true">◆</span><strong>Filtros</strong></div>
        <button type="button" className="catalog-clear" onClick={onClear}><RotateCcw size={13} /> Limpiar</button>
      </div>

      <FacetGroup label="Producto" filterKey="kinds" options={facets?.kinds ?? fallbackKinds} selected={filters.kinds} onToggle={onToggle} labels={productKindLabels} initiallyOpen />
      <FacetGroup label="Tipo / atributo" filterKey="pokemonTypes" options={facets?.pokemonTypes ?? fallbackPokemonTypes} selected={filters.pokemonTypes} onToggle={onToggle} labels={pokemonTypeLabels} typeDots initiallyOpen />
      <FacetGroup label="Colección / set" filterKey="setNames" options={facets?.sets ?? []} selected={filters.setNames} onToggle={onToggle} initiallyOpen />
      <FacetGroup label="Rareza" filterKey="rarities" options={facets?.rarities ?? []} selected={filters.rarities} onToggle={onToggle} />
      <FacetGroup label="Condición" filterKey="conditions" options={facets?.conditions ?? fallbackConditions} selected={filters.conditions} onToggle={onToggle} labels={conditionLabels} />
      <FacetGroup label="Idioma" filterKey="languages" options={facets?.languages ?? []} selected={filters.languages} onToggle={onToggle} />
      <FacetGroup label="Acabado" filterKey="finishes" options={facets?.finishes ?? []} selected={filters.finishes} onToggle={onToggle} />
      <FacetGroup label="Edición" filterKey="editions" options={facets?.editions ?? []} selected={filters.editions} onToggle={onToggle} />
      <FacetGroup label="Empresa de grading" filterKey="gradingCompanies" options={facets?.gradingCompanies ?? []} selected={filters.gradingCompanies} onToggle={onToggle} />

      <details className="catalog-filter-group" open={filters.setCode !== ''}>
        <summary>Código de set<span>{filters.setCode ? '1' : ''}</span></summary>
        <SetCodeField key={filters.setCode} id={id} value={filters.setCode} onApply={(setCode) => onChange({ ...filters, setCode })} />
      </details>

      <details className="catalog-filter-group" open={filters.minPrice !== '' || filters.maxPrice !== ''}>
        <summary>Precio ARS<span>{filters.minPrice || filters.maxPrice ? '●' : ''}</span></summary>
        <PriceRangeFields
          key={`${filters.minPrice}-${filters.maxPrice}`}
          id={id}
          min={filters.minPrice}
          max={filters.maxPrice}
          minPlaceholder={minorToArs(facets?.priceRange.minMinor ?? null)}
          maxPlaceholder={minorToArs(facets?.priceRange.maxMinor ?? null)}
          onApply={(minPrice, maxPrice) => onChange({ ...filters, minPrice, maxPrice })}
        />
      </details>

      <div className="catalog-quick-filters">
        <BinaryFilter
          label="Disponibilidad"
          value={filters.inStock}
          trueLabel="Con stock"
          falseLabel="Sin stock"
          onChange={(inStock) => onChange({ ...filters, inStock })}
        />
        <BinaryFilter
          label="Certificación"
          value={filters.graded}
          trueLabel="Graduadas"
          falseLabel="Sin graduar"
          onChange={(graded) => onChange({ ...filters, graded })}
        />
      </div>
    </div>
  );
}

function SetCodeField({ id, value, onApply }: { id: string; value: string; onApply: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <form className="catalog-inline-form" onSubmit={(event) => { event.preventDefault(); onApply(draft.trim().slice(0, 40)); }}>
      <label className="catalog-inline-field" htmlFor={`${id}-set-code`}>
        <span className="sr-only">Código del set</span>
        <input id={`${id}-set-code`} value={draft} maxLength={40} placeholder="Ej. SV4" onChange={(event) => setDraft(event.target.value)} />
      </label>
      <Button type="submit" variant="secondary">Aplicar</Button>
    </form>
  );
}

function BinaryFilter({ label, value, trueLabel, falseLabel, onChange }: {
  label: string;
  value: boolean | null;
  trueLabel: string;
  falseLabel: string;
  onChange: (value: boolean | null) => void;
}) {
  const options: Array<{ label: string; value: boolean | null }> = [
    { label: 'Todos', value: null },
    { label: trueLabel, value: true },
    { label: falseLabel, value: false },
  ];
  return (
    <fieldset>
      <legend>{label}</legend>
      {options.map((option) => (
        <button
          type="button"
          className="catalog-filter-option"
          aria-pressed={value === option.value}
          key={String(option.value)}
          onClick={() => onChange(option.value)}
        >
          <span className="catalog-filter-marker" aria-hidden="true">{value === option.value ? '◆' : '◇'}</span>
          <span>{option.label}</span>
        </button>
      ))}
    </fieldset>
  );
}

function PriceRangeFields({ id, min, max, minPlaceholder, maxPlaceholder, onApply }: {
  id: string;
  min: string;
  max: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  onApply: (min: string, max: string) => void;
}) {
  const [minPrice, setMinPrice] = useState(min);
  const [maxPrice, setMaxPrice] = useState(max);
  const [error, setError] = useState<string | null>(null);
  const apply = () => {
    const result = validateCatalogPriceRange(minPrice, maxPrice);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError(null);
    onApply(result.minPrice, result.maxPrice);
  };
  return (
    <fieldset className="catalog-price-fields">
      <legend className="sr-only">Rango de precio en pesos argentinos</legend>
      <label htmlFor={`${id}-min-price`}><span>Mínimo</span><input id={`${id}-min-price`} inputMode="decimal" value={minPrice} placeholder={minPlaceholder || '0'} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-price-error` : undefined} onChange={(event) => setMinPrice(event.target.value)} /></label>
      <label htmlFor={`${id}-max-price`}><span>Máximo</span><input id={`${id}-max-price`} inputMode="decimal" value={maxPrice} placeholder={maxPlaceholder || 'Sin límite'} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-price-error` : undefined} onChange={(event) => setMaxPrice(event.target.value)} /></label>
      {error && <p className="catalog-price-error" id={`${id}-price-error`} role="alert">{error}</p>}
      <Button type="button" variant="secondary" onClick={apply}>Aplicar precio</Button>
    </fieldset>
  );
}
