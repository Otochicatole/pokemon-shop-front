import { adminFetch } from '@/shared/admin/client';
import { auditListEnvelopeSchema, type AuditEntry } from '../domain/contracts';

export interface AuditQuery { actorId?: string; action?: string; entityType?: string; requestId?: string; from?: string; to?: string; cursor?: string; limit?: number }
export async function listAuditEntries(query: AuditQuery): Promise<{ data: AuditEntry[]; nextCursor: string | null }> { const params = new URLSearchParams(); Object.entries(query).forEach(([key, value]) => { if (value === undefined || value === '') return; if ((key === 'from' || key === 'to') && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) { params.set(key, new Date(`${value}T${key === 'to' ? '23:59:59.999' : '00:00:00.000'}`).toISOString()); return; } params.set(key, String(value)); }); const response = await adminFetch(`/admin/audit?${params}`, {}, auditListEnvelopeSchema); return { data: response.data, nextCursor: response.meta.nextCursor }; }
