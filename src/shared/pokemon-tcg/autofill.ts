import { z } from 'zod';
import type { PokemonType } from '@/shared/api/contracts';

export const pokemonTcgMarketPriceSchema = z.object({
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.literal('USD'),
  source: z.string(),
  variant: z.string(),
  updatedAt: z.string(),
});

export type PokemonTcgMarketPrice = z.infer<typeof pokemonTcgMarketPriceSchema>;

type AutofillCard = {
  name: string; description: string; effect: string; category: string; types: string[];
  setName: string; setCode: string; localId: string; rarity: string; language: string;
  holo: boolean; firstEdition: boolean; marketPrice?: PokemonTcgMarketPrice | null;
};

const elementalTypes: Record<string, PokemonType> = {
  COLORLESS: 'COLORLESS', INCOLORO: 'COLORLESS', DARKNESS: 'DARKNESS', DARK: 'DARKNESS', OSCURIDAD: 'DARKNESS',
  DRAGON: 'DRAGON', FAIRY: 'FAIRY', HADA: 'FAIRY', FIGHTING: 'FIGHTING', LUCHA: 'FIGHTING',
  FIRE: 'FIRE', FUEGO: 'FIRE', GRASS: 'GRASS', PLANTA: 'GRASS', LIGHTNING: 'LIGHTNING', RAYO: 'LIGHTNING',
  METAL: 'METAL', PSYCHIC: 'PSYCHIC', PSIQUICO: 'PSYCHIC', WATER: 'WATER', AGUA: 'WATER',
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

export function marketPriceDecimal(price: PokemonTcgMarketPrice | null | undefined) {
  if (!price || price.currency !== 'USD' || !/^\d+$/.test(price.amountMinor)) return null;
  const minor = BigInt(price.amountMinor);
  if (minor <= 0n) return null;
  return `${minor / 100n}.${(minor % 100n).toString().padStart(2, '0')}`;
}

export function pokemonTcgAutofill(card: AutofillCard) {
  const price = marketPriceDecimal(card.marketPrice);
  const finish = price ? ({ normal: 'Normal', holofoil: 'Holo', 'reverse-holofoil': 'Reverse Holo' }[card.marketPrice!.variant]) : undefined;
  const category = normalize(card.category);
  const noElementalType = ['TRAINER', 'ENTRENADOR', 'ENERGY', 'ENERGIA'].includes(category);
  const pokemonType = elementalTypes[normalize(card.types[0] ?? '')];
  return {
    name: card.name,
    kind: 'SINGLE_CARD' as const,
    ...(card.description || card.effect ? { description: card.description || card.effect } : {}),
    ...(noElementalType ? { pokemonType: undefined } : pokemonType ? { pokemonType } : {}),
    ...(card.setName ? { setName: card.setName } : {}),
    ...(card.setCode ? { setCode: card.setCode } : {}),
    ...(card.localId ? { cardNumber: card.localId } : {}),
    ...(card.rarity ? { rarity: card.rarity } : {}),
    ...(card.language ? { language: card.language } : {}),
    ...(finish ? { finish } : card.holo ? { finish: 'Holo' } : {}),
    ...(card.firstEdition ? { edition: '1.ª edición' } : {}),
    ...(price ? { price } : {}),
  };
}

export function pokemonTcgPriceNote(card: Pick<AutofillCard, 'marketPrice'>) {
  const price = marketPriceDecimal(card.marketPrice);
  const updatedAt = card.marketPrice?.updatedAt ? new Date(card.marketPrice.updatedAt) : null;
  const dateNote = updatedAt && Number.isFinite(updatedAt.getTime())
    ? ` · actualizado ${updatedAt.toLocaleDateString('es-AR', { timeZone: 'UTC' })}`
    : '';
  return price
    ? `Referencia: USD ${price} · ${card.marketPrice!.source} · ${card.marketPrice!.variant}${dateNote}. El precio de venta es editable; verificá la variante y condición.`
    : 'Sin referencia de precio en USD para esta carta. Se conservó el precio de venta; podés editarlo.';
}
