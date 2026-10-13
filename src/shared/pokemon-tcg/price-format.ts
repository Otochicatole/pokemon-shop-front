const variantLabels: Record<string, string> = { normal: 'Normal', holofoil: 'Holo', 'reverse-holofoil': 'Reverse Holo' };
const sourceLabels: Record<string, string> = { tcgplayer: 'TCGPlayer', cardmarket: 'Cardmarket' };

export const sourceName = (source: string) => sourceLabels[source.toLowerCase()] ?? source;
export const variantName = (variant: string) => variantLabels[variant] ?? variant;

export function formatPrice(amountMinor: string, currency: string) {
  const minor = BigInt(amountMinor);
  return `${currency} ${(minor / 100n).toLocaleString('es-AR')},${(minor % 100n).toString().padStart(2, '0')}`;
}

export function priceDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'No informada';
}
