import { z } from 'zod';
import type { Money, ProviderMoney } from '@/shared/api/contracts';

export const storefrontFxQuoteSchema = z.object({
  casa: z.string(),
  source: z.string(),
  rate: z.string(),
  rateMicros: z.string().regex(/^\d+$/),
  fetchedAt: z.string().or(z.date()),
  expiresAt: z.string().or(z.date()),
});

export type StorefrontFxQuote = z.infer<typeof storefrontFxQuoteSchema>;

const SCALE = 1_000_000n;

export function usdMinorToArsMinor(usdMinor: bigint | string, rateMicros: bigint | string): bigint {
  const usd = typeof usdMinor === 'bigint' ? usdMinor : BigInt(usdMinor);
  const rate = typeof rateMicros === 'bigint' ? rateMicros : BigInt(rateMicros);
  if (usd < 0n || rate <= 0n) throw new Error('Money amounts cannot be negative');
  return (usd * rate + SCALE / 2n) / SCALE;
}

export function toArsMoney(usd: Money | undefined, rateMicros: string | null | undefined): ProviderMoney | undefined {
  if (!usd) return undefined;
  if (!rateMicros) return undefined;
  try {
    return {
      amountMinor: usdMinorToArsMinor(usd.amountMinor, rateMicros).toString(),
      currency: 'ARS',
    };
  } catch {
    return undefined;
  }
}

export function formatArsFromUsd(usd: Money | undefined, rateMicros: string | null | undefined) {
  const ars = toArsMoney(usd, rateMicros);
  if (!ars) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(BigInt(ars.amountMinor)) / 100);
}

export function arsDecimalToUsdMinor(arsDecimal: string, rateMicros: string): string | null {
  const normalized = arsDecimal.replace(',', '.').trim();
  if (!normalized || !/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  const arsMinor = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  const rate = BigInt(rateMicros);
  if (rate <= 0n) return null;
  return ((arsMinor * SCALE) / rate).toString();
}

export function usdMinorToArsDecimal(usdMinor: string, rateMicros: string): string {
  const arsMinor = usdMinorToArsMinor(usdMinor, rateMicros);
  const decimals = (arsMinor % 100n).toString().padStart(2, '0');
  return decimals === '00' ? (arsMinor / 100n).toString() : `${arsMinor / 100n}.${decimals}`;
}

function usdDecimalToMinor(usdDecimal: string): string | null {
  const normalized = usdDecimal.replace(',', '.').trim();
  if (!normalized || !/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  return (BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))).toString();
}

function minorToDecimal(minor: string): string {
  const value = BigInt(minor);
  const decimals = (value % 100n).toString().padStart(2, '0');
  return decimals === '00' ? (value / 100n).toString() : `${value / 100n}.${decimals}`;
}

/** Convert a USD decimal string (filter state) to ARS decimal for display. */
export function usdDecimalToArsDecimal(usdDecimal: string, rateMicros: string): string {
  const usdMinor = usdDecimalToMinor(usdDecimal);
  if (!usdMinor) return '';
  return usdMinorToArsDecimal(usdMinor, rateMicros);
}

/** Convert an ARS decimal input to USD decimal for catalog filter/API state. */
export function arsDecimalToUsdDecimal(arsDecimal: string, rateMicros: string): string | null {
  const usdMinor = arsDecimalToUsdMinor(arsDecimal, rateMicros);
  if (usdMinor === null) return null;
  return minorToDecimal(usdMinor);
}
