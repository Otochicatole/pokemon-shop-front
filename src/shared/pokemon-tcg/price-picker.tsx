'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/button/Button';
import { searchPokemonTcgCards } from '@/features/product-management/infrastructure/api';
import { searchAffiliatePokemonTcgCards } from '@/features/affiliate/infrastructure/api';
import { marketPriceDecimal, type PokemonTcgMarketPrice } from './autofill';
import { PokemonTcgSearchDialog } from './search-dialog';
import { usePokemonTcgSearch } from './use-search';
import styles from './search-dialog.module.css';

type Props = {
  scope: 'admin' | 'affiliate';
  cardName: string;
  onApply: (price: PokemonTcgMarketPrice) => void;
  disabled?: boolean;
};

export function PokemonTcgPricePicker({ scope, cardName, onApply, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const search = usePokemonTcgSearch({ open, scope, searchCards: scope === 'admin' ? searchPokemonTcgCards : searchAffiliatePokemonTcgCards });

  function apply(price: PokemonTcgMarketPrice) {
    if (disabled || !marketPriceDecimal(price)) return;
    onApply(price);
    setOpen(false);
  }

  return <>
    <Button type="button" variant="secondary" className={styles.priceTrigger} disabled={disabled} onClick={() => { search.reset(cardName); setOpen(true); }}>
      <Search size={16} aria-hidden="true" />Buscar precio
    </Button>
    {open && <PokemonTcgSearchDialog
      open={open} onClose={() => setOpen(false)}
      input={search.input} onInputChange={search.setInput} onSearch={search.search}
      query={search.query} page={search.page} pagination={search.results.data?.meta}
      cards={search.results.data?.data} onPageChange={search.changePage} onRetry={search.retry}
      isFetching={search.results.isFetching} isError={search.results.isError}
      errorMessage={search.results.error instanceof Error ? search.results.error.message : undefined}
      loadingId={null}
      onSelect={(card) => { if (card.marketPrice) apply(card.marketPrice); }}
      priceSelection={{ scope, onApply: apply }}
      footerNote="Elegí un importe en USD para completar el precio de venta. Los valores históricos conservan su fecha y el precio sigue siendo editable."
    />}
  </>;
}
