import { adminFetch } from '@/shared/admin/client';
import { adminExchangeRateSettingsEnvelopeSchema, type AdminExchangeRateSettingsInput } from '../domain/contracts';

export async function getAdminExchangeRateSettings() {
  const response = await adminFetch('/admin/config/exchange-rate', {}, adminExchangeRateSettingsEnvelopeSchema);
  return response.data;
}

export async function updateAdminExchangeRateSettings(input: AdminExchangeRateSettingsInput) {
  const response = await adminFetch('/admin/config/exchange-rate', { method: 'PATCH', body: JSON.stringify(input) }, adminExchangeRateSettingsEnvelopeSchema);
  return response.data;
}
