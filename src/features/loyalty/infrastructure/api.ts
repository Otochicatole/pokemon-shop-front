import { apiFetch } from '@/shared/api/client';
import { loyaltyAccountEnvelopeSchema, loyaltyProgramEnvelopeSchema } from '../domain/contracts';

export async function getLoyaltyProgram() {
  const response = await apiFetch('/loyalty/program', {}, loyaltyProgramEnvelopeSchema);
  return response.data.program;
}

export async function getLoyaltyAccount(cursor?: string) {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const response = await apiFetch(`/loyalty/account?${params}`, {}, loyaltyAccountEnvelopeSchema);
  return response.data;
}
