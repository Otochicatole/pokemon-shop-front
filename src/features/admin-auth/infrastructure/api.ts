import { adminFetch, resetAdminCsrf, setAdminCsrf } from '@/shared/admin/client';
import { adminSessionEnvelopeSchema, type AdminIdentity, type AdminLoginInput } from '../domain/contracts';

export async function loginAdmin(input: AdminLoginInput): Promise<AdminIdentity> {
  const response = await adminFetch('/admin/auth/login', { method: 'POST', body: JSON.stringify(input) }, adminSessionEnvelopeSchema);
  setAdminCsrf(response.data.csrfToken ?? null);
  return response.data.admin;
}

export async function getAdminMe(): Promise<AdminIdentity> {
  const response = await adminFetch('/admin/auth/me', {}, adminSessionEnvelopeSchema);
  return response.data.admin;
}

export async function logoutAdmin(): Promise<void> {
  await adminFetch('/admin/auth/logout', { method: 'POST' });
  resetAdminCsrf();
}
