'use client';

import type { Money, ProviderMoney } from '@/shared/api/contracts';
import { formatMoney as formatRawMoney } from '@/shared/lib/format';
import { useStorefrontFx } from '@/shared/fx/StorefrontFxProvider';

/** Formats USD catalog money as ARS for storefront. Pass `raw` for already-ARS provider amounts. */
export function StorefrontMoney({
  money,
  raw = false,
}: {
  money: Money | ProviderMoney | undefined;
  raw?: boolean;
}) {
  const fx = useStorefrontFx();
  if (!money) return 'A confirmar';
  if (raw || money.currency === 'ARS') return <span className="product-data money">{formatRawMoney(money)}</span>;
  const converted = fx.formatMoney(money as Money);
  if (converted !== '—') return <span className="product-data money">{converted}</span>;
  return <span className="product-data money" title="Precio base en USD. El equivalente en pesos se confirma al finalizar la compra.">{formatRawMoney(money)} USD</span>;
}
