import { z } from 'zod';

export const adminTransferSettingsSchema = z.object({
  enabled: z.boolean(),
  bankName: z.string(),
  accountHolder: z.string(),
  cbu: z.string().nullable(),
  alias: z.string().nullable(),
  version: z.number().int().positive(),
  updatedAt: z.string().or(z.date()),
  currency: z.literal('USD'),
});

export const adminTransferSettingsEnvelopeSchema = z.object({
  data: adminTransferSettingsSchema,
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type AdminTransferSettings = z.infer<typeof adminTransferSettingsSchema>;
export type AdminTransferSettingsInput = {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  cbu: string | null;
  alias: string | null;
  expectedVersion: number;
};
