import { z } from 'zod';
import { pokemonTcgMarketPriceSchema } from './autofill';

export const pokemonTcgPriceSchema = z.object({
  source: z.string(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  variant: z.string(),
  amountMinor: z.string().regex(/^\d+$/),
  lowAmountMinor: z.string().regex(/^\d+$/).nullable(),
  highAmountMinor: z.string().regex(/^\d+$/).nullable(),
  updatedAt: z.string(),
});

export const pokemonTcgCardSummarySchema = z.object({
  id: z.string(), name: z.string(), localId: z.string(), setCode: z.string(),
  imageUrl: z.string().url().nullable(), setName: z.string().optional(),
  rarity: z.string().optional(), category: z.string().optional(), types: z.array(z.string()).optional(),
  firstEdition: z.boolean().optional(), holo: z.boolean().optional(),
  language: z.string().optional(), region: z.enum(['int', 'jp']).optional(), special: z.string().nullable().optional(),
  marketPrice: pokemonTcgMarketPriceSchema.nullable().optional(), prices: z.array(pokemonTcgPriceSchema).optional(),
});

export type PokemonTcgCardSummary = z.infer<typeof pokemonTcgCardSummarySchema>;
export type PokemonTcgPrice = z.infer<typeof pokemonTcgPriceSchema>;

export const pokemonTcgPaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const pokemonTcgSearchEnvelopeSchema = z.object({
  data: z.array(pokemonTcgCardSummarySchema),
  meta: pokemonTcgPaginationSchema,
});

export type PokemonTcgPagination = z.infer<typeof pokemonTcgPaginationSchema>;
export type PokemonTcgSearchResult = z.infer<typeof pokemonTcgSearchEnvelopeSchema>;

export const pokemonTcgPriceHistoryPointSchema = z.object({
  sourceId: z.string().min(1),
  source: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/),
  variant: z.string().min(1),
  amountMinor: z.string().regex(/^\d+$/),
  recordedAt: z.iso.date(),
  observedAt: z.iso.datetime().nullable(),
});

export const pokemonTcgPriceHistoryDataSchema = z.object({
  cardId: z.string().regex(/^[1-9]\d*$/),
  prices: z.array(pokemonTcgPriceHistoryPointSchema),
});

export const pokemonTcgPriceHistoryEnvelopeSchema = z.object({ data: pokemonTcgPriceHistoryDataSchema });
export type PokemonTcgPriceHistoryPoint = z.infer<typeof pokemonTcgPriceHistoryPointSchema>;
export type PokemonTcgPriceHistoryData = z.infer<typeof pokemonTcgPriceHistoryDataSchema>;
