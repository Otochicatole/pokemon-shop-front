'use client';

import type { Money } from '@/shared/api/contracts';
import { useStorefrontFx } from '@/shared/fx/StorefrontFxProvider';
import { formatMoney } from '@/shared/lib/format';
import styles from './page.module.css';

export function ProductPurchasePrice({ price }: { price: Money }) {
  const fx = useStorefrontFx();
  const converted = fx.formatMoney(price);
  const hasConversion = converted !== '—';

  return (
    <div className={styles.priceBlock}>
      <span className={styles.priceLabel}>Precio por unidad</span>
      <p className={styles.price}>
        <strong>{hasConversion ? converted : formatMoney(price)}</strong>
        <span>{hasConversion ? 'ARS' : price.currency}</span>
      </p>
      {hasConversion && <p className={styles.basePrice}>Precio base: {formatMoney(price)} USD</p>}
      <p className={styles.priceNote}>
        {hasConversion ? 'El importe en pesos se actualiza con la cotización vigente. El total se confirma al finalizar la compra.'
          : fx.isLoading ? 'Calculando el equivalente en pesos…'
            : 'El equivalente en pesos no está disponible por el momento. Se muestra el precio base en USD.'}
      </p>
    </div>
  );
}
