import { adminFetch } from '@/shared/admin/client';
import { adminTransferSettingsEnvelopeSchema, type AdminTransferSettingsInput } from '../domain/contracts';

export async function getAdminTransferSettings() {
  const response = await adminFetch('/admin/config/transfer', {}, adminTransferSettingsEnvelopeSchema);
  return response.data;
}

export async function updateAdminTransferSettings(input: AdminTransferSettingsInput) {
  const response = await adminFetch('/admin/config/transfer', { method: 'PATCH', body: JSON.stringify(input) }, adminTransferSettingsEnvelopeSchema);
  return response.data;
}
