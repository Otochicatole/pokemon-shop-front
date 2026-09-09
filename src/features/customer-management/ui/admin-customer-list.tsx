'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Eye, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { AdminDataTable, AdminPageHeader, Button, CursorPagination, SelectField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge, adminMoney } from '@/shared/admin/format';
import { listAdminCustomers } from '../infrastructure/api';

export function AdminCustomerListView() {
  const [filters, setFilters] = useState({ search: '', status: '', verified: '' }); const [cursor, setCursor] = useState<string>(); const [history, setHistory] = useState<Array<string | undefined>>([]);
  const query = useQuery({ queryKey: ['admin', 'customers', filters, cursor], queryFn: () => listAdminCustomers({ ...filters, cursor, limit: 30 }), placeholderData: (previous) => previous });
  const change = (key: keyof typeof filters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setCursor(undefined); setHistory([]); };
  return <><AdminPageHeader eyebrow="Consulta de identidad" title="Clientes" description="Vista de solo lectura de estado, verificación y actividad comercial." actions={<Button variant="secondary" onClick={() => void query.refetch()}><RefreshCw size={16} />Actualizar</Button>} /><div className="admin-toolbar"><TextField className="admin-search-field" label="Buscar" value={filters.search} onChange={(event) => change('search', event.target.value)} placeholder="Nombre o email" /><SelectField label="Estado" value={filters.status} onChange={(event) => change('status', event.target.value)}><option value="">Todos</option><option value="ACTIVE">Activos</option><option value="SUSPENDED">Suspendidos</option></SelectField><SelectField label="Email" value={filters.verified} onChange={(event) => change('verified', event.target.value)}><option value="">Todos</option><option value="true">Verificados</option><option value="false">Sin verificar</option></SelectField></div>{query.isLoading ? <div className="admin-loading">Cargando clientes</div> : query.isError ? <div className="admin-error-panel"><div><h2>No pudimos cargar clientes</h2><p>{adminErrorMessage(query.error)}</p></div></div> : <><AdminDataTable rows={query.data?.data ?? []} rowKey={(row) => row.id} caption="Clientes" columns={[
    { key: 'customer', header: 'Cliente', render: (row) => <div><Link className="admin-table-link" href={`/admin/customers/${row.id}`}>{row.name ?? 'Sin nombre'}</Link><small className="admin-block-muted">{row.email}</small></div> },
    { key: 'verified', header: 'Verificación', render: (row) => <AdminBadge value={row.emailVerifiedAt ? 'VERIFIED' : 'UNVERIFIED'} /> },
    { key: 'status', header: 'Estado', render: (row) => <AdminBadge value={row.status} /> },
    { key: 'orders', header: 'Órdenes', align: 'center', render: (row) => row.ordersCount ?? 0 },
    { key: 'paid', header: 'Compras', align: 'right', render: (row) => <span className="admin-money">{adminMoney(row.paidTotal)}</span> },
    { key: 'joined', header: 'Alta', render: (row) => adminDate(row.createdAt) },
    { key: 'action', header: 'Detalle', align: 'right', render: (row) => <Link className="admin-icon-button" href={`/admin/customers/${row.id}`} aria-label={`Abrir cliente ${row.email}`}><Eye size={17} /></Link> },
  ]} /><CursorPagination canPrevious={history.length > 0} canNext={Boolean(query.data?.nextCursor)} loading={query.isFetching} onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }} onNext={() => { if (!query.data?.nextCursor) return; setHistory((current) => [...current, cursor]); setCursor(query.data.nextCursor ?? undefined); }} /></>}</>;
}

