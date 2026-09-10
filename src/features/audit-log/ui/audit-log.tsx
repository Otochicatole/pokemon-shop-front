'use client';

import { useQuery } from '@tanstack/react-query';
import { Braces, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { AdminDataTable, AdminPageHeader, Button, CursorPagination, Dialog, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate } from '@/shared/admin/format';
import type { AuditEntry } from '../domain/contracts';
import { listAuditEntries } from '../infrastructure/api';

export function AuditLogView() {
  const [filters, setFilters] = useState({ actorId: '', action: '', entityType: '', requestId: '', from: '', to: '' }); const [cursor, setCursor] = useState<string>(); const [history, setHistory] = useState<Array<string | undefined>>([]); const [selected, setSelected] = useState<AuditEntry | null>(null);
  const query = useQuery({ queryKey: ['admin', 'audit', filters, cursor], queryFn: () => listAuditEntries({ ...filters, cursor, limit: 40 }), placeholderData: (previous) => previous });
  const change = (key: keyof typeof filters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setCursor(undefined); setHistory([]); };
  return <><AdminPageHeader eyebrow="Registro inmutable" title="Auditoría" description="Acciones administrativas con metadata sensible redactada por el backend." actions={<Button variant="secondary" onClick={() => void query.refetch()}><RefreshCw size={16} />Actualizar</Button>} /><div className="admin-toolbar audit-toolbar"><TextField label="Administrador (ID)" value={filters.actorId} onChange={(event) => change('actorId', event.target.value)} /><TextField label="Acción" value={filters.action} onChange={(event) => change('action', event.target.value)} placeholder="PRODUCT_UPDATED" /><TextField label="Entidad" value={filters.entityType} onChange={(event) => change('entityType', event.target.value)} /><TextField label="Request ID" value={filters.requestId} onChange={(event) => change('requestId', event.target.value)} /><TextField label="Desde" type="date" value={filters.from} onChange={(event) => change('from', event.target.value)} /><TextField label="Hasta" type="date" value={filters.to} onChange={(event) => change('to', event.target.value)} /></div>{query.isLoading ? <div className="admin-loading">Cargando auditoría</div> : query.isError ? <div className="admin-error-panel"><div><h2>No pudimos cargar la auditoría</h2><p>{adminErrorMessage(query.error)}</p></div></div> : <><AdminDataTable rows={query.data?.data ?? []} rowKey={(entry) => entry.id} caption="Eventos de auditoría" columns={[
    { key: 'date', header: 'Fecha', render: (entry) => adminDate(entry.createdAt, true) },
    { key: 'action', header: 'Acción', render: (entry) => <strong className="admin-code">{entry.action}</strong> },
    { key: 'actor', header: 'Administrador', render: (entry) => <span title={entry.actorId ?? undefined}>{entry.actorId ? entry.actorId.slice(0, 8) : 'Sistema'}</span> },
    { key: 'entity', header: 'Entidad', render: (entry) => <div>{entry.entityType}<small className="admin-block-muted">{entry.entityId?.slice(0, 12) ?? '—'}</small></div> },
    { key: 'request', header: 'Request ID', render: (entry) => <span className="admin-code" title={entry.requestId ?? undefined}>{entry.requestId?.slice(0, 12) ?? '—'}</span> },
    { key: 'meta', header: 'Metadata', align: 'right', render: (entry) => <button type="button" className="admin-icon-button" onClick={() => setSelected(entry)} aria-label={`Ver metadata de ${entry.action}`}><Braces size={17} /></button> },
  ]} /><CursorPagination canPrevious={history.length > 0} canNext={Boolean(query.data?.nextCursor)} loading={query.isFetching} onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }} onNext={() => { if (!query.data?.nextCursor) return; setHistory((current) => [...current, cursor]); setCursor(query.data.nextCursor ?? undefined); }} /></>}<Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title="Detalle de auditoría" description={selected ? `${selected.action} · ${adminDate(selected.createdAt, true)}` : undefined} className="admin-wide-dialog"><pre className="admin-json-view">{JSON.stringify(selected?.metadata ?? null, null, 2)}</pre></Dialog></>;
}
