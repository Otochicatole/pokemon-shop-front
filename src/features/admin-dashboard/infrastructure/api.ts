import { adminFetch } from '@/shared/admin/client';
import { adminDashboardEnvelopeSchema, type AdminDashboard, type DashboardRange } from '../domain/contracts';

export async function getAdminDashboard(range: DashboardRange): Promise<AdminDashboard> {
  const response = await adminFetch(`/admin/dashboard?range=${range}`, {}, adminDashboardEnvelopeSchema);
  return response.data;
}
