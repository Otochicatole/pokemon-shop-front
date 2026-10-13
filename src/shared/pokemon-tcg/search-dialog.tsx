'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, History, ImageOff, LoaderCircle, Search } from 'lucide-react';
import { Dialog } from '@/components/overlay/Dialog';
import type { PokemonTcgCardSummary, PokemonTcgPagination, PokemonTcgPrice } from './contracts';
import { marketPriceDecimal, type PokemonTcgMarketPrice } from './autofill';
import { formatPrice as money, priceDate, sourceName, variantName } from './price-format';
import { PokemonTcgPriceHistory } from './price-history';
import styles from './search-dialog.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  input: string;
  onInputChange: (value: string) => void;
  onSearch: () => void;
  onRetry?: () => void;
  query: string;
  page?: number;
  pagination?: PokemonTcgPagination;
  onPageChange?: (page: number) => void;
  cards?: PokemonTcgCardSummary[];
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
  loadingId: string | null;
  onSelect: (card: PokemonTcgCardSummary) => void;
  footerNote?: string;
  priceSelection?: { scope: 'admin' | 'affiliate'; onApply: (price: PokemonTcgMarketPrice) => void };
};

const categoryLabels: Record<string, string> = { Pokemon: 'Pokémon', Trainer: 'Entrenador', Energy: 'Energía' };

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

function PriceDetails({ prices, onApply }: { prices: PokemonTcgPrice[]; onApply?: (price: PokemonTcgMarketPrice) => void }) {
  return (
    <details className={styles.priceDetails}>
      <summary><ChevronDown size={16} aria-hidden="true" /><span>Ver todos los precios <span className={styles.priceCount}>({prices.length})</span></span></summary>
      <div className={styles.priceTableWrap}>
        <table className={styles.priceTable}>
          <caption>Precios de referencia por mercado y variante. Cada importe conserva su moneda.</caption>
          <thead><tr><th scope="col">Mercado / variante</th><th scope="col">Precio</th><th scope="col">Mínimo</th><th scope="col">Máximo</th><th scope="col">Actualizado (UTC)</th>{onApply && <th scope="col">Aplicar</th>}</tr></thead>
          <tbody>{prices.map((price, index) => (
            <tr key={`${price.source}-${price.currency}-${price.variant}-${index}`}>
              <th scope="row">{sourceName(price.source)}<span>{variantName(price.variant)}</span></th>
              <td>{money(price.amountMinor, price.currency)}</td>
              <td>{price.lowAmountMinor !== null ? money(price.lowAmountMinor, price.currency) : 'No informado'}</td>
              <td>{price.highAmountMinor !== null ? money(price.highAmountMinor, price.currency) : 'No informado'}</td>
              <td><time dateTime={price.updatedAt}>{priceDate(price.updatedAt)}</time></td>
              {onApply && <td>{price.currency === 'USD' && BigInt(price.amountMinor) > 0n ? <button type="button" className={styles.tableApply} onClick={() => onApply({ ...price, currency: 'USD' })} aria-label={`Usar ${money(price.amountMinor, price.currency)} de ${sourceName(price.source)}, ${variantName(price.variant)}`}>Usar precio</button> : <span className={styles.currencyNote}>Solo referencia</span>}</td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </details>
  );
}

function CardResult({ card, loadingId, onSelect, priceSelection, onViewHistory }: Pick<Props, 'loadingId' | 'onSelect' | 'priceSelection'> & { card: PokemonTcgCardSummary; onViewHistory: (card: PokemonTcgCardSummary) => void }) {
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
        <button type="button" className={styles.selectButton} disabled={loadingId !== null || Boolean(priceSelection && !marketPriceDecimal(price))} onClick={() => onSelect(card)} aria-label={`${priceSelection ? 'Usar precio de' : 'Usar carta'} ${card.name}, ${card.setName || card.setCode}, número ${card.localId}`}>
          {loadingId === card.id ? <><LoaderCircle size={16} className={styles.spin} aria-hidden="true" />Completando…</> : <>{priceSelection ? 'Usar precio' : 'Usar carta'}<ArrowRight size={16} aria-hidden="true" /></>}
        </button>
        {priceSelection && <button type="button" className={styles.historyToggle} data-price-history-card={card.id} onClick={() => onViewHistory(card)}><History size={16} aria-hidden="true" />Ver historial de precios<ArrowRight size={14} aria-hidden="true" /></button>}
      </div>
      {!!card.prices?.length && <PriceDetails prices={card.prices} onApply={priceSelection?.onApply} />}
    </article>
  );
}

export function PokemonTcgSearchDialog({ open, onClose, input, onInputChange, onSearch, onRetry, query, page = 1, pagination, onPageChange, cards = [], isFetching, isError, errorMessage, loadingId, onSelect, footerNote, priceSelection }: Props) {
  const inputId = useId();
  const resultsId = useId();
  const resultsRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const returnPosition = useRef<{ cardId: string; listScroll: number; dialogScroll: number } | null>(null);
  const [historyCard, setHistoryCard] = useState<PokemonTcgCardSummary | null>(null);
  const searched = query.trim().length >= 2;
  const busy = isFetching || loadingId !== null;
  const searchDisabled = input.trim().length < 2 || isFetching || loadingId !== null;
  const total = pagination?.total ?? cards.length;
  const showPagination = searched && onPageChange && ((pagination?.totalPages ?? 0) > 1 || page > 1);
  const rangeStart = cards.length && pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const rangeEnd = pagination ? Math.min(total, rangeStart + cards.length - 1) : cards.length;
  useEffect(() => {
    if (!open || !resultsRef.current) return;
    resultsRef.current.scrollTop = 0;
    const dialog = resultsRef.current.closest<HTMLElement>('[role="dialog"]');
    if (dialog) dialog.scrollTop = 0;
  }, [open, query, page]);
  useEffect(() => {
    if (!open) return;
    if (historyCard) {
      backRef.current?.focus({ preventScroll: true });
      const dialog = historyRef.current?.closest<HTMLElement>('[role="dialog"]');
      if (dialog) dialog.scrollTop = 0;
      return;
    }
    const saved = returnPosition.current;
    if (!saved || !resultsRef.current || isFetching) return;
    resultsRef.current.scrollTop = saved.listScroll;
    const dialog = resultsRef.current.closest<HTMLElement>('[role="dialog"]');
    if (dialog) dialog.scrollTop = saved.dialogScroll;
    const trigger = Array.from(resultsRef.current.querySelectorAll<HTMLButtonElement>('[data-price-history-card]')).find((button) => button.dataset.priceHistoryCard === saved.cardId);
    trigger?.focus({ preventScroll: true });
    returnPosition.current = null;
  }, [open, historyCard, isFetching]);
  function viewHistory(card: PokemonTcgCardSummary) {
    returnPosition.current = {
      cardId: card.id,
      listScroll: resultsRef.current?.scrollTop ?? 0,
      dialogScroll: resultsRef.current?.closest<HTMLElement>('[role="dialog"]')?.scrollTop ?? 0,
    };
    setHistoryCard(card);
  }
  return (
    <Dialog open={open} onClose={onClose} title={historyCard && priceSelection ? 'Historial de precios' : priceSelection ? 'Buscar precio de venta' : 'Autocompletar carta'} className={`${styles.searchDialog} ${historyCard && priceSelection ? styles.historyDialog : ''}`} description={historyCard && priceSelection ? undefined : priceSelection ? 'Buscá una carta, compará sus precios y consultá el historial antes de elegir un importe en USD.' : 'Elegí una carta para completar sus datos, imagen y precio de referencia en USD.'}>
      {historyCard && priceSelection ? <>
        <button ref={backRef} type="button" className={styles.backButton} onClick={() => setHistoryCard(null)}><ArrowLeft size={16} aria-hidden="true" />Volver a resultados</button>
        <div className={styles.historyCard}>
          <CardImage key={historyCard.imageUrl} card={historyCard} />
          <div className={styles.historyIdentity}>
            <h3>{historyCard.name}</h3>
            <p>{historyCard.setName || 'Colección no informada'}</p>
            <span>Set {historyCard.setCode || '—'} · N.º {historyCard.localId || '—'}</span>
          </div>
          <div className={styles.currentQuote}>
            {historyCard.marketPrice ? <>
              <span>Precio actual de referencia</span>
              <strong>{money(historyCard.marketPrice.amountMinor, historyCard.marketPrice.currency)}</strong>
              <span>{sourceName(historyCard.marketPrice.source)} · {variantName(historyCard.marketPrice.variant)}</span>
              {marketPriceDecimal(historyCard.marketPrice) && <button type="button" className={styles.tableApply} onClick={() => priceSelection.onApply(historyCard.marketPrice!)}>Usar precio actual</button>}
            </> : <span>Sin precio actual en USD</span>}
          </div>
        </div>
        <div ref={historyRef} className={styles.historyBody}>
          <PokemonTcgPriceHistory key={historyCard.id} card={historyCard} scope={priceSelection.scope} onApply={priceSelection.onApply} hideHeading />
        </div>
      </> : <>
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
        <span>{isFetching ? page > 1 ? `Cargando página ${page}…` : 'Buscando cartas y precios…' : isError ? `No se pudo cargar la página ${page}` : searched ? `${total} ${total === 1 ? 'carta encontrada' : 'cartas encontradas'} para “${query}”` : 'Catálogo Pokémon TCG'}</span>
        {searched && !isFetching && !isError && pagination && cards.length > 0 && <span>Mostrando {rangeStart}–{rangeEnd} de {total}</span>}
      </div>
      {showPagination && <nav className={styles.pagination} aria-label="Páginas de resultados">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={busy || page <= 1} aria-controls={resultsId}><ArrowLeft size={16} aria-hidden="true" />Anterior</button>
        <span aria-current="page">Página <strong>{page}</strong>{pagination && pagination.totalPages > 0 ? ` de ${pagination.totalPages}` : ''}</span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={busy || isError || !pagination || page >= pagination.totalPages} aria-controls={resultsId}>Siguiente<ArrowRight size={16} aria-hidden="true" /></button>
      </nav>}
      <div ref={resultsRef} id={resultsId} className={styles.results} aria-busy={isFetching}>
        {isFetching ? <div className={styles.emptyState}><LoaderCircle size={28} className={styles.spin} aria-hidden="true" /><p>Consultando el catálogo<span>Buscamos los datos y precios disponibles de cada carta.</span></p></div>
          : isError ? <div className={styles.errorState} role="alert"><p>{errorMessage || 'No pudimos consultar el catálogo.'}</p><button type="button" onClick={onRetry ?? onSearch} disabled={busy}>Reintentar búsqueda</button></div>
          : !searched ? <div className={styles.emptyState}><Search size={28} aria-hidden="true" /><p>Encontrá la versión exacta<span>Ingresá al menos 2 caracteres. Podrás comparar colección, número, rareza y precios antes de elegir.</span></p></div>
          : !cards.length ? <div className={styles.emptyState}><Search size={28} aria-hidden="true" /><p>{page > 1 ? 'No hay cartas en esta página' : `No encontramos cartas para “${query}”`}<span>{page > 1 ? 'Volvé a la página anterior o realizá una nueva búsqueda.' : 'Probá con menos palabras o revisá cómo se escribe el nombre.'}</span></p></div>
          : cards.map((card) => <CardResult key={card.id} card={card} loadingId={loadingId} onSelect={onSelect} priceSelection={priceSelection} onViewHistory={viewHistory} />)}
      </div>
      </>}
      <p className={styles.footerNote}>{footerNote || 'Los precios varían según el mercado, la variante y la condición. Podés editar el precio de venta.'}</p>
    </Dialog>
  );
}
