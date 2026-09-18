import { z } from 'zod';

export const dolarCasaSchema = z.enum(['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta']);

export const adminExchangeRateSettingsSchema = z.object({
  casa: dolarCasaSchema,
  version: z.number().int().positive(),
  updatedAt: z.string().or(z.date()),
  availableCasas: z.array(z.object({
    value: z.string(),
    label: z.string(),
    rate: z.string().nullable(),
  })),
  currentRate: z.object({
    source: z.string(),
    rate: z.string(),
    fetchedAt: z.string().or(z.date()),
    expiresAt: z.string().or(z.date()),
  }).nullable(),
});

export const adminExchangeRateSettingsEnvelopeSchema = z.object({
  data: adminExchangeRateSettingsSchema,
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type AdminExchangeRateSettings = z.infer<typeof adminExchangeRateSettingsSchema>;
export type AdminExchangeRateSettingsInput = {
  casa: z.infer<typeof dolarCasaSchema>;
  expectedVersion: number;
};
