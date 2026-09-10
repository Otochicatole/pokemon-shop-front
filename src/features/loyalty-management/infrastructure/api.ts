import { adminFetch } from '@/shared/admin/client';
import { adminLoyaltyProgramEnvelopeSchema, type AdminLoyaltyProgramInput } from '../domain/contracts';

export async function getAdminLoyaltyProgram() {
  const response = await adminFetch('/admin/loyalty/config', {}, adminLoyaltyProgramEnvelopeSchema);
  return response.data;
}

export async function updateAdminLoyaltyProgram(input: AdminLoyaltyProgramInput) {
  const response = await adminFetch('/admin/loyalty/config', { method: 'PATCH', body: JSON.stringify(input) }, adminLoyaltyProgramEnvelopeSchema);
  return response.data;
}
