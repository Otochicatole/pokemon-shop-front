'use client';

import { useId, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import type { PokemonTcgPriceHistoryPoint } from './contracts';
import { formatPrice, priceDate, sourceName, variantName } from './price-format';
import styles from './price-history-chart.module.css';

type Props = {
  points: PokemonTcgPriceHistoryPoint[];
  source: string;
  currency: string;
  variant: string;
};

type ChartPoint = PokemonTcgPriceHistoryPoint & { timestamp: number; value: number };

function PriceTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;
  return <div className={styles.tooltip} role="status" aria-live="polite">
    <time dateTime={point.recordedAt}>{priceDate(point.recordedAt)} · UTC</time>
    <strong>{formatPrice(point.amountMinor, point.currency)}</strong>
    <span>{sourceName(point.source)} · {variantName(point.variant)}</span>
  </div>;
}

const tickDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' });
const tickPrice = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 2, notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard' });

export default function PokemonTcgPriceHistoryChart({ points, source, currency, variant }: Props) {
  const chartId = useId();
  const [tooltipTrigger, setTooltipTrigger] = useState<'hover' | 'click'>('hover');
  const data: ChartPoint[] = [...points].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || (a.observedAt ?? '').localeCompare(b.observedAt ?? '')).map((point) => ({
    ...point,
    timestamp: Date.parse(`${point.recordedAt}T00:00:00Z`),
    // Only chart coordinates use floating point; the tooltip and table retain the exact minor-unit string.
    value: Number(point.amountMinor) / 100,
  }));
  if (!data.length) return <p className={styles.empty}>No hay registros para graficar en este período.</p>;
  const first = data[0];
  const last = data[data.length - 1];
  const dates = [...new Set(data.map((point) => point.timestamp))];
  const ticks = [...new Set([0, Math.floor((dates.length - 1) / 3), Math.floor((dates.length - 1) * 2 / 3), dates.length - 1].map((index) => dates[index]))];
  const xDomain: [number, number] = first.timestamp === last.timestamp ? [first.timestamp - 43_200_000, last.timestamp + 43_200_000] : [first.timestamp, last.timestamp];
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = min === max ? Math.max(1, max * 0.05) : (max - min) * 0.12;
  const yDomain: [number, number] = [Math.max(0, min - padding), max + padding];
  const label = `Evolución de ${sourceName(source)} · ${variantName(variant)} · ${currency}`;

  return <figure className={styles.chart} aria-labelledby={`${chartId}-caption`}>
    <figcaption id={`${chartId}-caption`}>
      <strong>{label}</strong>
      <span>{data.length} {data.length === 1 ? 'registro' : 'registros'} · {priceDate(first.recordedAt)}–{priceDate(last.recordedAt)}</span>
    </figcaption>
    <div className={styles.axisLabel}>Precio ({currency})</div>
    <div className={styles.plot} onPointerDownCapture={(event) => { if (event.pointerType === 'touch') setTooltipTrigger('click'); }} onPointerMoveCapture={(event) => { if (event.pointerType === 'mouse') setTooltipTrigger('hover'); }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} accessibilityLayer aria-label={label} aria-describedby={`${chartId}-help`} margin={{ top: 12, right: 20, left: 0, bottom: 12 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="timestamp" type="number" scale="time" domain={xDomain} ticks={ticks} tickFormatter={tickDate} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--line-strong)' }} tickMargin={12} minTickGap={28} interval="preserveStartEnd" padding={{ left: 12, right: 12 }} />
          <YAxis domain={yDomain} tickFormatter={tickPrice} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} tickMargin={10} width={64} tickCount={5} />
          <Tooltip trigger={tooltipTrigger} content={PriceTooltip} cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '4 4' }} isAnimationActive={false} />
          <Line type="linear" dataKey="value" name="Precio" stroke="var(--cyan)" strokeWidth={2} dot={{ r: 4, fill: 'var(--cyan)', stroke: 'var(--surface)', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: 'var(--cyan)', stroke: 'var(--accent)', strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <p id={`${chartId}-help`} className={styles.help}>Pasá por un punto o tocá el gráfico para ver su precio. Con teclado, usá las flechas izquierda y derecha. Fechas en UTC.</p>
  </figure>;
}
