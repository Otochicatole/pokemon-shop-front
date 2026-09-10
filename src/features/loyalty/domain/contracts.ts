import { z } from 'zod';
import { loyaltyAccountSchema, loyaltyProgramSchema, loyaltyTransactionSchema } from '@/shared/api/contracts';

export const loyaltyProgramEnvelopeSchema = z.object({
  data: z.object({ program: loyaltyProgramSchema }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const loyaltyAccountEnvelopeSchema = z.object({
  data: z.object({
    program: loyaltyProgramSchema,
    account: loyaltyAccountSchema,
    transactions: z.array(loyaltyTransactionSchema),
    nextCursor: z.string().nullable(),
  }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type LoyaltyAccountView = z.infer<typeof loyaltyAccountEnvelopeSchema>['data'];
