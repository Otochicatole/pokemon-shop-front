'use client';

import { useId, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import type { PokemonTcgMarketPrice } from './autofill';
import type { PokemonTcgCardSummary, PokemonTcgPriceHistoryPoint } from './contracts';
import { getPokemonTcgPriceHistory } from './price-api';
import { formatPrice, priceDate, sourceName, variantName } from './price-format';
import styles from './price-history.module.css';

type Props = {
  card: PokemonTcgCardSummary;
  scope: 'admin' | 'affiliate';
  onApply: (price: PokemonTcgMarketPrice) => void;
  hideHeading?: boolean;
};

type Series = {
  key: string;
  source: string;
  currency: string;
  variant: string;
  points: PokemonTcgPriceHistoryPoint[];
};

const PAGE_SIZE = 10;
type Period = '30d' | '1y' | 'all';
const periods: { value: Period; label: string }[] = [{ value: '30d', label: '30 días' }, { value: '1y', label: '1 año' }, { value: 'all', label: 'Todo' }];
const HistoryChart = dynamic(() => import('./price-history-chart'), {
  ssr: false,
  loading: () => <div className={styles.chartLoading} aria-label="Cargando gráfico"><LoaderCircle size={20} className={styles.spin} aria-hidden="true" /><span>Cargando gráfico…</span></div>,
});

function groupSeries(points: PokemonTcgPriceHistoryPoint[]) {
  const groups = new Map<string, Series>();
  for (const point of points) {
    const key = JSON.stringify([point.sourceId, point.currency, point.variant]);
    const group = groups.get(key) ?? { key, source: point.source, currency: point.currency, variant: point.variant, points: [] };
    group.points.push(point);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    points: group.points.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || (b.observedAt ?? '').localeCompare(a.observedAt ?? '')),
  }));
}

function HistoryData({ points, onApply }: { points: PokemonTcgPriceHistoryPoint[]; onApply: Props['onApply'] }) {
  const seriesId = useId();
  const tableId = useId();
  const series = useMemo(() => groupSeries(points), [points]);
  const [selection, setSelection] = useState<{ key: string; page: number; period: Period }>({ key: '', page: 1, period: '30d' });
  const selected = series.find((group) => group.key === selection.key) ?? series.find((group) => group.currency === 'USD') ?? series[0];
  const latestDate = selected.points[0].recordedAt;
  const cutoff = new Date(`${latestDate}T00:00:00Z`);
  if (selection.period === '30d') cutoff.setUTCDate(cutoff.getUTCDate() - 29);
  if (selection.period === '1y') cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const filtered = selection.period === 'all' ? selected.points : selected.points.filter((point) => point.recordedAt >= cutoffDate);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page = Math.min(selection.page, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const canApplyCurrency = selected.currency === 'USD';

  return <>
    <div className={styles.controls}>
      <div className={styles.seriesControl}>
        <label htmlFor={seriesId}>Mercado, variante y moneda</label>
        <select id={seriesId} value={selected.key} onChange={(event) => setSelection({ ...selection, key: event.target.value, page: 1 })}>
          {series.map((group) => <option key={group.key} value={group.key}>{sourceName(group.source)} · {variantName(group.variant)} · {group.currency}</option>)}
        </select>
      </div>
      <fieldset className={styles.periodControl}>
        <legend>Período</legend>
        <div>{periods.map(({ value, label }) => <button key={value} type="button" aria-pressed={selection.period === value} onClick={() => setSelection({ key: selected.key, page: 1, period: value })}>{label}</button>)}</div>
      </fieldset>
    </div>
    <p className={styles.periodNote}>Período hasta el último registro: <time dateTime={latestDate}>{priceDate(latestDate)}</time>.</p>
    {!canApplyCurrency && <p className={styles.currencyNote}>Este mercado cotiza en {selected.currency}. El precio de venta se completa con importes en USD.</p>}
    <HistoryChart key={`${selected.key}-${selection.period}`} points={filtered} source={selected.source} currency={selected.currency} variant={selected.variant} />
    <div className={styles.tableWrap}>
      <table id={tableId} className={styles.table}>
        <caption>Precios registrados · {sourceName(selected.source)} · {variantName(selected.variant)} · {selected.currency}</caption>
        <thead><tr><th scope="col">Fecha (UTC)</th><th scope="col">Precio</th>{canApplyCurrency && <th scope="col">Completar precio</th>}</tr></thead>
        <tbody>{visible.map((point, index) => <tr key={`${point.recordedAt}-${point.observedAt}-${index}`}>
          <th scope="row"><time dateTime={point.recordedAt}>{priceDate(point.recordedAt)}</time></th>
          <td>{formatPrice(point.amountMinor, point.currency)}</td>
          {canApplyCurrency && <td>{BigInt(point.amountMinor) > 0n ? <button type="button" className={styles.applyButton} aria-label={`Usar precio del ${priceDate(point.recordedAt)}`} onClick={() => onApply({
            amountMinor: point.amountMinor, currency: 'USD', source: point.source, variant: point.variant,
            updatedAt: point.observedAt ?? `${point.recordedAt}T00:00:00Z`,
          })}>Usar precio<ArrowRight size={14} aria-hidden="true" /></button> : <span className={styles.unavailable}>No aplicable</span>}</td>}
        </tr>)}</tbody>
      </table>
    </div>
    <div className={styles.tableFooter}>
      <span role="status">{start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} de {filtered.length} registros</span>
      {totalPages > 1 && <nav aria-label="Páginas del historial">
        <button type="button" disabled={page <= 1} aria-controls={tableId} aria-label="Registros anteriores" onClick={() => setSelection({ ...selection, key: selected.key, page: page - 1 })}><ArrowLeft size={16} aria-hidden="true" />Anterior</button>
        <span>Página {page} de {totalPages}</span>
        <button type="button" disabled={page >= totalPages} aria-controls={tableId} aria-label="Registros siguientes" onClick={() => setSelection({ ...selection, key: selected.key, page: page + 1 })}>Siguiente<ArrowRight size={16} aria-hidden="true" /></button>
      </nav>}
    </div>
  </>;
}

export function PokemonTcgPriceHistory({ card, scope, onApply, hideHeading = false }: Props) {
  const headingId = useId();
  const history = useQuery({
    queryKey: ['pokemon-tcg', 'price-history', scope, card.id],
    queryFn: ({ signal }) => getPokemonTcgPriceHistory(scope, card.id, signal),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return <section className={`${styles.history}${hideHeading ? ` ${styles.standalone}` : ''}`} aria-labelledby={headingId} aria-busy={history.isFetching}>
    <h4 id={headingId} className={hideHeading ? styles.srOnly : undefined}>Historial de precios</h4>
    {history.isPending ? <p className={styles.loading} role="status"><LoaderCircle size={18} className={styles.spin} aria-hidden="true" />Cargando historial de {card.name}…</p>
      : history.isError ? <div className={styles.error} role="alert"><p>No pudimos cargar el historial. Volvé a intentarlo.</p><button type="button" onClick={() => { void history.refetch(); }} disabled={history.isFetching}>Reintentar historial</button></div>
      : !history.data.prices.length ? <p className={styles.empty}>Todavía no hay precios históricos disponibles para esta carta.</p>
      : <HistoryData key={card.id} points={history.data.prices} onApply={onApply} />}
  </section>;
}
