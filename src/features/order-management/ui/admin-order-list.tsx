'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Eye, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { AdminDataTable, AdminPageHeader, Button, CursorPagination, SelectField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge, adminMoney } from '@/shared/admin/format';
import { listAdminOrders } from '../infrastructure/api';

export function AdminOrderListView() {
  const [filters, setFilters] = useState({ search: '', status: '', paymentMethod: '', paymentStatus: '', fulfillmentType: '', from: '', to: '' });
  const [cursor, setCursor] = useState<string>(); const [history, setHistory] = useState<Array<string | undefined>>([]);
  const query = useQuery({ queryKey: ['admin', 'orders', filters, cursor], queryFn: () => listAdminOrders({ ...filters, cursor, limit: 25 }), placeholderData: (previous) => previous, refetchInterval: 30_000 });
  const change = (key: keyof typeof filters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setCursor(undefined); setHistory([]); };
  return <><AdminPageHeader eyebrow="Operación comercial" title="Órdenes" description="Buscá por número o cliente, revisá pagos y ejecutá solamente las transiciones permitidas." actions={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>} />
    <div className="admin-toolbar admin-order-toolbar"><TextField className="admin-search-field" label="Buscar" value={filters.search} onChange={(event) => change('search', event.target.value)} placeholder="Orden o email" /><SelectField label="Estado" value={filters.status} onChange={(event) => change('status', event.target.value)}><option value="">Todos</option>{['PENDING_PAYMENT','PAYMENT_REVIEW','PAID','PREPARING','READY_FOR_PICKUP','SHIPPED','COMPLETED','CANCELLED','EXPIRED','REFUND_RECORDED','PAYMENT_REQUIRES_REVIEW'].map((value) => <option key={value} value={value}>{value}</option>)}</SelectField><SelectField label="Método de pago" value={filters.paymentMethod} onChange={(event) => change('paymentMethod', event.target.value)}><option value="">Todos</option><option value="BANK_TRANSFER">Transferencia</option><option value="MERCADO_PAGO">Mercado Pago</option></SelectField><SelectField label="Estado de pago" value={filters.paymentStatus} onChange={(event) => change('paymentStatus', event.target.value)}><option value="">Todos</option>{['PENDING','UNDER_REVIEW','APPROVED','REJECTED','FAILED','REFUNDED','DISPUTED','REQUIRES_REVIEW'].map((value) => <option key={value} value={value}>{value}</option>)}</SelectField><SelectField label="Entrega" value={filters.fulfillmentType} onChange={(event) => change('fulfillmentType', event.target.value)}><option value="">Todas</option><option value="SHIPMENT">Envío</option><option value="PICKUP">Retiro</option></SelectField><TextField label="Desde" type="date" value={filters.from} onChange={(event) => change('from', event.target.value)} /><TextField label="Hasta" type="date" value={filters.to} onChange={(event) => change('to', event.target.value)} /></div>
    {query.isLoading ? <div className="admin-loading">Cargando órdenes</div> : query.isError ? <div className="admin-error-panel"><div><h2>No pudimos cargar las órdenes</h2><p>{adminErrorMessage(query.error)}</p></div></div> : <><AdminDataTable rows={query.data?.data ?? []} rowKey={(row) => row.id} caption="Órdenes" columns={[
      { key: 'number', header: 'Orden', render: (row) => <div><Link className="admin-table-link" href={`/admin/orders/${row.number}`}>{row.number}</Link><small className="admin-block-muted">{adminDate(row.createdAt, true)}</small></div> },
      { key: 'customer', header: 'Cliente', render: (row) => <div>{row.customer.name || 'Sin nombre'}<small className="admin-block-muted">{row.customer.email}</small></div> },
      { key: 'status', header: 'Estado', render: (row) => <AdminBadge value={row.status} /> },
      { key: 'payment', header: 'Pago', render: (row) => <div><AdminBadge value={row.payment?.status ?? 'PENDING'} /><small className="admin-block-muted">{row.paymentMethod === 'BANK_TRANSFER' ? 'Transferencia' : 'Mercado Pago'}</small></div> },
      { key: 'fulfillment', header: 'Entrega', render: (row) => <AdminBadge value={row.fulfillmentType} /> },
      { key: 'total', header: 'Total', align: 'right', render: (row) => <span className="admin-money">{adminMoney(row.totals.total)}</span> },
      { key: 'action', header: 'Acción', align: 'right', render: (row) => <Link className="admin-icon-button" href={`/admin/orders/${row.number}`} aria-label={`Abrir orden ${row.number}`}><Eye size={17} /></Link> },
    ]} /><CursorPagination canPrevious={history.length > 0} canNext={Boolean(query.data?.nextCursor)} loading={query.isFetching} onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }} onNext={() => { if (!query.data?.nextCursor) return; setHistory((current) => [...current, cursor]); setCursor(query.data.nextCursor ?? undefined); }} /></>}
  </>;
}
