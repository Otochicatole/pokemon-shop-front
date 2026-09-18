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
  if (!money) return '—';
  if (raw || money.currency === 'ARS') return formatRawMoney(money);
  return fx.formatMoney(money as Money);
}
