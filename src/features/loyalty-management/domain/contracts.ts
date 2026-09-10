import { z } from 'zod';
import { loyaltyProgramSchema } from '@/shared/api/contracts';

export const adminLoyaltyProgramEnvelopeSchema = z.object({
  data: loyaltyProgramSchema,
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type AdminLoyaltyProgram = z.infer<typeof loyaltyProgramSchema>;
export type AdminLoyaltyProgramInput = {
  enabled: boolean;
  spendPerPointMinor: string;
  pointsPerStep: number;
  pointValueMinor: string;
  minimumRedemptionPoints: number;
  maximumRedemptionPercent: number;
  expectedVersion: number;
};
