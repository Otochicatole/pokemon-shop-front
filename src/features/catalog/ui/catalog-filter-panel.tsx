'use client';

import { useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/button';
import type { CatalogFacetOption, CatalogFilters } from '@/shared/api/contracts';
import { validateCatalogPriceRange } from '../application/catalog-filter-codec';
import {
  conditionLabels,
  pokemonTypeLabels,
  productKindLabels,
  type CatalogArrayFilterKey,
  type CatalogFilterState,
} from '../domain/catalog-filters';
import { useStorefrontFx } from '@/shared/fx/StorefrontFxProvider';
import { arsDecimalToUsdDecimal, usdDecimalToArsDecimal, usdMinorToArsDecimal } from '@/shared/fx/money';

import styles from './catalog-filter-panel.module.css';

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

function includeSelected(options: CatalogFacetOption[], selected: string[]): CatalogFacetOption[] {
  const known = new Set(options.map((option) => option.value));
  return [...options, ...selected.filter((value) => !known.has(value)).map((value) => ({ value, count: 0 }))];
}

function FacetGroup({ label, filterKey, options, selected, onToggle, labels, typeDots = false, initiallyOpen = false }: FacetGroupProps) {
  if (options.length === 0 && selected.length === 0) return null;

  return (
    <details className={`${styles.catalogFilterGroup} catalog-filter-group`} open={initiallyOpen || selected.length > 0}>
      <summary>{label}<span>{selected.length || ''}</span></summary>
      <fieldset>
        <legend className="sr-only">{label}</legend>
        {includeSelected(options, selected).map((option) => (
          <button
            type="button"
            className={`${styles.catalogFilterOption} catalog-filter-option`}
            aria-pressed={selected.includes(option.value)}
            key={option.value}
            onClick={() => onToggle(filterKey, option.value)}
          >
            <span className={`${styles.catalogFilterMarker} catalog-filter-marker`} aria-hidden="true">{selected.includes(option.value) ? '◆' : '◇'}</span>
            {typeDots && <i className={`${styles.catalogTypeDot} type-${option.value.toLowerCase()} catalog-type-dot`} aria-hidden="true" />}
            <span>{labels?.[option.value] ?? option.value}</span>
            {(option.count > 0 || options.some((item) => item.count > 0)) && <small>{option.count}</small>}
          </button>
        ))}
      </fieldset>
    </details>
  );
}

function SingleValueFacetGroup({ label, options, value, onChange, initiallyOpen = false }: {
  label: string;
  options: CatalogFacetOption[];
  value: string;
  onChange: (value: string) => void;
  initiallyOpen?: boolean;
}) {
  if (options.length === 0 && !value) return null;
  const selected = value ? [value] : [];
  return (
    <details className={`${styles.catalogFilterGroup} catalog-filter-group`} open={initiallyOpen || Boolean(value)}>
      <summary>{label}<span>{value ? '1' : ''}</span></summary>
      <fieldset>
        <legend className="sr-only">{label}</legend>
        {includeSelected(options, selected).map((option) => (
          <button
            type="button"
            className={`${styles.catalogFilterOption} catalog-filter-option`}
            aria-pressed={value === option.value}
            key={option.value}
            onClick={() => onChange(value === option.value ? '' : option.value)}
          >
            <span className={`${styles.catalogFilterMarker} catalog-filter-marker`} aria-hidden="true">{value === option.value ? '◆' : '◇'}</span>
            <span>{option.value}</span>
            {(option.count > 0 || options.some((item) => item.count > 0)) && <small>{option.count}</small>}
          </button>
        ))}
      </fieldset>
    </details>
  );
}

export function CatalogFilterPanel({ filters, facets, onToggle, onChange, onClear, labelledBy }: CatalogFilterPanelProps) {
  const id = useId();
  const fx = useStorefrontFx();
  const rateMicros = fx.rateMicros;
  const toArsDisplay = (usdDecimal: string) => (rateMicros && usdDecimal ? usdDecimalToArsDecimal(usdDecimal, rateMicros) : '');
  const toArsPlaceholder = (usdMinor: string | null | undefined) => {
    if (!rateMicros || !usdMinor || !/^\d+$/.test(usdMinor)) return '';
    return usdMinorToArsDecimal(usdMinor, rateMicros);
  };

  return (
    <div className={`${styles.catalogFilterPanel} catalog-filter-panel`} aria-labelledby={labelledBy}>
      <div className={`${styles.catalogFilterPanelHeading} catalog-filter-panel-heading`}>
        <div><span aria-hidden="true">◆</span><strong>Filtros</strong></div>
        <button type="button" className={`${styles.catalogClear} catalog-clear`} onClick={onClear}><RotateCcw size={13} /> Limpiar</button>
      </div>

      <FacetGroup label="Producto" filterKey="kinds" options={facets?.kinds ?? []} selected={filters.kinds} onToggle={onToggle} labels={productKindLabels} initiallyOpen />
      <FacetGroup label="Tipo / atributo" filterKey="pokemonTypes" options={facets?.pokemonTypes ?? []} selected={filters.pokemonTypes} onToggle={onToggle} labels={pokemonTypeLabels} typeDots initiallyOpen />
      <FacetGroup label="Colección / set" filterKey="setNames" options={facets?.sets ?? []} selected={filters.setNames} onToggle={onToggle} initiallyOpen />
      <SingleValueFacetGroup
        label="Código de set"
        options={facets?.setCodes ?? []}
        value={filters.setCode}
        onChange={(setCode) => onChange({ ...filters, setCode })}
      />
      <FacetGroup label="Rareza" filterKey="rarities" options={facets?.rarities ?? []} selected={filters.rarities} onToggle={onToggle} />
      <FacetGroup label="Condición" filterKey="conditions" options={facets?.conditions ?? []} selected={filters.conditions} onToggle={onToggle} labels={conditionLabels} />
      <FacetGroup label="Idioma" filterKey="languages" options={facets?.languages ?? []} selected={filters.languages} onToggle={onToggle} />
      <FacetGroup label="Acabado" filterKey="finishes" options={facets?.finishes ?? []} selected={filters.finishes} onToggle={onToggle} />
      <FacetGroup label="Edición" filterKey="editions" options={facets?.editions ?? []} selected={filters.editions} onToggle={onToggle} />
      <FacetGroup label="Empresa de grading" filterKey="gradingCompanies" options={facets?.gradingCompanies ?? []} selected={filters.gradingCompanies} onToggle={onToggle} />

      <details className={`${styles.catalogFilterGroup} catalog-filter-group`} open={filters.minPrice !== '' || filters.maxPrice !== ''}>
        <summary>Precio<span>{filters.minPrice || filters.maxPrice ? '●' : ''}</span></summary>
        <PriceRangeFields
          key={`${filters.minPrice}-${filters.maxPrice}-${rateMicros ?? 'none'}`}
          id={id}
          min={toArsDisplay(filters.minPrice)}
          max={toArsDisplay(filters.maxPrice)}
          minPlaceholder={toArsPlaceholder(facets?.priceRange.minMinor ?? null)}
          maxPlaceholder={toArsPlaceholder(facets?.priceRange.maxMinor ?? null)}
          rateMicros={rateMicros}
          onApply={(minPrice, maxPrice) => onChange({ ...filters, minPrice, maxPrice })}
        />
      </details>

      <div className={`${styles.catalogQuickFilters} catalog-quick-filters`}>
        {(filters.inStock !== null || (facets?.availability?.inStock ?? 0) > 0 || (facets?.availability?.outOfStock ?? 0) > 0) && (
          <BinaryFilter
            label="Disponibilidad"
            value={filters.inStock}
            trueLabel="Con stock"
            falseLabel="Sin stock"
            trueCount={facets?.availability?.inStock}
            falseCount={facets?.availability?.outOfStock}
            onChange={(inStock) => onChange({ ...filters, inStock })}
          />
        )}
        {(filters.graded !== null || (facets?.availability?.graded ?? 0) > 0 || (facets?.availability?.ungraded ?? 0) > 0) && (
          <BinaryFilter
            label="Certificación"
            value={filters.graded}
            trueLabel="Graduadas"
            falseLabel="Sin graduar"
            trueCount={facets?.availability?.graded}
            falseCount={facets?.availability?.ungraded}
            onChange={(graded) => onChange({ ...filters, graded })}
          />
        )}
      </div>
    </div>
  );
}

function BinaryFilter({ label, value, trueLabel, falseLabel, trueCount, falseCount, onChange }: {
  label: string;
  value: boolean | null;
  trueLabel: string;
  falseLabel: string;
  trueCount?: number;
  falseCount?: number;
  onChange: (value: boolean | null) => void;
}) {
  const options: Array<{ label: string; value: boolean | null; count?: number }> = [
    { label: 'Todos', value: null },
    ...(trueCount === 0 && value !== true ? [] : [{ label: trueLabel, value: true as boolean | null, count: trueCount }]),
    ...(falseCount === 0 && value !== false ? [] : [{ label: falseLabel, value: false as boolean | null, count: falseCount }]),
  ];
  return (
    <fieldset>
      <legend>{label}</legend>
      {options.map((option) => (
        <button
          type="button"
          className={`${styles.catalogFilterOption} catalog-filter-option`}
          aria-pressed={value === option.value}
          key={String(option.value)}
          onClick={() => onChange(option.value)}
        >
          <span className={`${styles.catalogFilterMarker} catalog-filter-marker`} aria-hidden="true">{value === option.value ? '◆' : '◇'}</span>
          <span>{option.label}</span>
          {typeof option.count === 'number' && <small>{option.count}</small>}
        </button>
      ))}
    </fieldset>
  );
}

function PriceRangeFields({ id, min, max, minPlaceholder, maxPlaceholder, rateMicros, onApply }: {
  id: string;
  min: string;
  max: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  rateMicros: string | null;
  onApply: (min: string, max: string) => void;
}) {
  const [minPrice, setMinPrice] = useState(min);
  const [maxPrice, setMaxPrice] = useState(max);
  const [error, setError] = useState<string | null>(null);
  const apply = () => {
    if (!rateMicros) {
      setError('No hay cotización disponible para filtrar por precio.');
      return;
    }
    const result = validateCatalogPriceRange(minPrice, maxPrice);
    if (!result.success) {
      setError(result.error);
      return;
    }
    const minUsd = result.minPrice ? arsDecimalToUsdDecimal(result.minPrice, rateMicros) : '';
    const maxUsd = result.maxPrice ? arsDecimalToUsdDecimal(result.maxPrice, rateMicros) : '';
    if ((result.minPrice && minUsd === null) || (result.maxPrice && maxUsd === null)) {
      setError('No pudimos convertir el precio con la cotización actual.');
      return;
    }
    setError(null);
    onApply(minUsd ?? '', maxUsd ?? '');
  };
  return (
    <fieldset className={`${styles.catalogPriceFields} catalog-price-fields`}>
      <legend className="sr-only">Rango de precio en ARS</legend>
      <label htmlFor={`${id}-min-price`}><span>Mínimo ARS</span><input id={`${id}-min-price`} inputMode="decimal" value={minPrice} placeholder={minPlaceholder || '0'} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-price-error` : undefined} onChange={(event) => setMinPrice(event.target.value)} /></label>
      <label htmlFor={`${id}-max-price`}><span>Máximo ARS</span><input id={`${id}-max-price`} inputMode="decimal" value={maxPrice} placeholder={maxPlaceholder || 'Sin límite'} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-price-error` : undefined} onChange={(event) => setMaxPrice(event.target.value)} /></label>
      {error && <p className={`${styles.catalogPriceError} catalog-price-error`} id={`${id}-price-error`} role="alert">{error}</p>}
      {!rateMicros && <p className={`${styles.catalogPriceError} catalog-price-error`}>Cotización no disponible</p>}
      <Button type="button" variant="secondary" onClick={apply} disabled={!rateMicros}>Aplicar precio</Button>
    </fieldset>
  );
}
