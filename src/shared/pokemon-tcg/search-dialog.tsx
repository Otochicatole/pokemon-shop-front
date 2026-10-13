'use client';

import { useId, useState } from 'react';
import { ArrowRight, ChevronDown, ImageOff, LoaderCircle, Search } from 'lucide-react';
import { Dialog } from '@/components/overlay/Dialog';
import type { PokemonTcgCardSummary, PokemonTcgPrice } from './contracts';
import styles from './search-dialog.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  input: string;
  onInputChange: (value: string) => void;
  onSearch: () => void;
  query: string;
  cards?: PokemonTcgCardSummary[];
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
  loadingId: string | null;
  onSelect: (card: PokemonTcgCardSummary) => void;
  footerNote?: string;
};

const variantLabels: Record<string, string> = { normal: 'Normal', holofoil: 'Holo', 'reverse-holofoil': 'Reverse Holo' };
const sourceLabels: Record<string, string> = { tcgplayer: 'TCGPlayer', cardmarket: 'Cardmarket' };
const categoryLabels: Record<string, string> = { Pokemon: 'Pokémon', Trainer: 'Entrenador', Energy: 'Energía' };
const sourceName = (source: string) => sourceLabels[source.toLowerCase()] ?? source;
const variantName = (variant: string) => variantLabels[variant] ?? variant;

function money(amountMinor: string, currency: string) {
  const minor = BigInt(amountMinor);
  return `${currency} ${(minor / 100n).toLocaleString('es-AR')},${(minor % 100n).toString().padStart(2, '0')}`;
}

function priceDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'No informada';
}

function CardImage({ card }: { card: PokemonTcgCardSummary }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.artwork}>
      {card.imageUrl && !failed ? (
        // Catalog artwork is already validated by our API and can have varying dimensions.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt={`Carta ${card.name}, ${card.setCode} ${card.localId}`} width={112} height={156} loading="lazy" onError={() => setFailed(true)} />
      ) : <span className={styles.noImage}><ImageOff size={24} aria-hidden="true" />Sin imagen</span>}
    </div>
  );
}

function PriceDetails({ prices }: { prices: PokemonTcgPrice[] }) {
  return (
    <details className={styles.priceDetails}>
      <summary><ChevronDown size={16} aria-hidden="true" /><span>Ver todos los precios <span className={styles.priceCount}>({prices.length})</span></span></summary>
      <div className={styles.priceTableWrap}>
        <table className={styles.priceTable}>
          <caption>Precios de referencia por mercado y variante. Cada importe conserva su moneda.</caption>
          <thead><tr><th scope="col">Mercado / variante</th><th scope="col">Precio</th><th scope="col">Mínimo</th><th scope="col">Máximo</th><th scope="col">Actualizado (UTC)</th></tr></thead>
          <tbody>{prices.map((price, index) => (
            <tr key={`${price.source}-${price.currency}-${price.variant}-${index}`}>
              <th scope="row">{sourceName(price.source)}<span>{variantName(price.variant)}</span></th>
              <td>{money(price.amountMinor, price.currency)}</td>
              <td>{price.lowAmountMinor !== null ? money(price.lowAmountMinor, price.currency) : 'No informado'}</td>
              <td>{price.highAmountMinor !== null ? money(price.highAmountMinor, price.currency) : 'No informado'}</td>
              <td><time dateTime={price.updatedAt}>{priceDate(price.updatedAt)}</time></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </details>
  );
}

function CardResult({ card, loadingId, onSelect }: Pick<Props, 'loadingId' | 'onSelect'> & { card: PokemonTcgCardSummary }) {
  const titleId = useId();
  const price = card.marketPrice;
  const metadata = [
    ['Colección / set', card.setName], ['Código de set', card.setCode], ['Número de carta', card.localId],
    ['Rareza', card.rarity], ['Tipo / atributo', card.types?.join(' / ')], ['Categoría', categoryLabels[card.category ?? ''] ?? card.category],
    ['Idioma', card.language], ['Región', card.region === 'int' ? 'Internacional' : card.region === 'jp' ? 'Japón' : undefined],
    ...(card.special ? [['Especial', card.special]] : []),
    ...(card.holo ? [['Acabado', 'Holo']] : []),
    ...(card.firstEdition ? [['Edición', '1.ª edición']] : []),
  ];
  return (
    <article className={styles.result} aria-labelledby={titleId}>
      <CardImage key={card.imageUrl} card={card} />
      <div className={styles.cardInfo}>
        <h3 id={titleId}>{card.name}</h3>
        <dl className={styles.metadata}>{metadata.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd className={!value ? styles.missing : undefined}>{value || 'No informado'}</dd></div>
        ))}</dl>
      </div>
      <div className={styles.quote}>
        <span className={styles.quoteLabel}>Precio de referencia</span>
        {price ? <>
          <strong className={styles.amount}>{money(price.amountMinor, price.currency)}</strong>
          <span className={styles.quoteSource}>{sourceName(price.source)} · {variantName(price.variant)}</span>
          <span className={styles.quoteDate}>Actualizado <time dateTime={price.updatedAt}>{priceDate(price.updatedAt)}</time></span>
        </> : <p className={styles.noPrice}>Sin referencia en USD<span>Podés ingresar el precio manualmente.</span></p>}
        <button type="button" className={styles.selectButton} disabled={loadingId !== null} onClick={() => onSelect(card)} aria-label={`Usar carta ${card.name}, ${card.setName || card.setCode}, número ${card.localId}`}>
          {loadingId === card.id ? <><LoaderCircle size={16} className={styles.spin} aria-hidden="true" />Completando…</> : <>Usar carta<ArrowRight size={16} aria-hidden="true" /></>}
        </button>
      </div>
      {!!card.prices?.length && <PriceDetails prices={card.prices} />}
    </article>
  );
}

export function PokemonTcgSearchDialog({ open, onClose, input, onInputChange, onSearch, query, cards = [], isFetching, isError, errorMessage, loadingId, onSelect, footerNote }: Props) {
  const inputId = useId();
  const resultsId = useId();
  const searched = query.trim().length >= 2;
  const searchDisabled = input.trim().length < 2 || isFetching || loadingId !== null;
  return (
    <Dialog open={open} onClose={onClose} title="Autocompletar carta" className={styles.searchDialog} description="Elegí una carta para completar sus datos, imagen y precio de referencia en USD.">
      <div className={styles.searchBar} role="search" aria-label="Buscar en el catálogo Pokémon TCG">
        <label htmlFor={inputId}>Nombre o parte del nombre</label>
        <div className={styles.searchControls}>
          <input id={inputId} data-dialog-autofocus value={input} onChange={(event) => onInputChange(event.target.value)} placeholder="Ej.: Rayquaza, Pikachu, Charizard…" autoComplete="off" maxLength={80} aria-controls={resultsId} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (!searchDisabled) onSearch(); } }} />
          <button type="button" className={styles.searchButton} disabled={searchDisabled} onClick={onSearch}>
            {isFetching ? <LoaderCircle size={18} className={styles.spin} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}Buscar carta
          </button>
        </div>
      </div>
      <div className={styles.resultsHeading} role="status" aria-live="polite">
        <span>{isFetching ? 'Buscando cartas y precios…' : isError ? 'No se pudo completar la búsqueda' : searched ? `${cards.length} ${cards.length === 1 ? 'carta encontrada' : 'cartas encontradas'} para “${query}”` : 'Catálogo Pokémon TCG'}</span>
        {searched && !isFetching && !isError && cards.length >= 20 && <span>Se muestran las primeras {cards.length}. Afiná el nombre para ver otras cartas.</span>}
      </div>
      <div id={resultsId} className={styles.results} aria-busy={isFetching}>
        {isFetching ? <div className={styles.emptyState}><LoaderCircle size={28} className={styles.spin} aria-hidden="true" /><p>Consultando el catálogo<span>Buscamos los datos y precios disponibles de cada carta.</span></p></div>
          : isError ? <div className={styles.errorState} role="alert"><p>{errorMessage || 'No pudimos consultar el catálogo.'}</p><button type="button" onClick={onSearch} disabled={searchDisabled}>Reintentar búsqueda</button></div>
          : !searched ? <div className={styles.emptyState}><Search size={28} aria-hidden="true" /><p>Encontrá la versión exacta<span>Ingresá al menos 2 caracteres. Podrás comparar colección, número, rareza y precios antes de elegir.</span></p></div>
          : !cards.length ? <div className={styles.emptyState}><Search size={28} aria-hidden="true" /><p>No encontramos cartas para “{query}”<span>Probá con menos palabras o revisá cómo se escribe el nombre.</span></p></div>
          : cards.map((card) => <CardResult key={card.id} card={card} loadingId={loadingId} onSelect={onSelect} />)}
      </div>
      <p className={styles.footerNote}>{footerNote || 'Los precios varían según el mercado, la variante y la condición. Podés editar el precio de venta.'}</p>
    </Dialog>
  );
}
