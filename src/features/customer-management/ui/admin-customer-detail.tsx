'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { AdminDataTable, AdminPageHeader, CursorPagination } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge, adminMoney } from '@/shared/admin/format';
import { getAdminCustomer, listAdminCustomerOrders } from '../infrastructure/api';

export function AdminCustomerDetailView({ id }: { id: string }) {
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<Array<string | undefined>>([]);
  const query = useQuery({ queryKey: ['admin', 'customer', id], queryFn: () => getAdminCustomer(id) });
  const orders = useQuery({ queryKey: ['admin', 'customer', id, 'orders', cursor], queryFn: () => listAdminCustomerOrders(id, cursor) });
  if (query.isLoading) return <div className="admin-loading">Cargando cliente</div>;
  if (query.isError || !query.data) return <div className="admin-error-panel"><div><h1>Cliente no disponible</h1><p>{adminErrorMessage(query.error)}</p></div></div>;
  const customer = query.data;
  return <><AdminPageHeader eyebrow="Cliente // Solo lectura" title={customer.name ?? 'Sin nombre'} description={customer.email} actions={<><Link className="button button-secondary" href="/admin/customers"><ArrowLeft size={16} />Volver</Link><AdminBadge value={customer.status} /></>} /><div className="admin-stats admin-stats-compact"><div className="admin-stat-card admin-tone-cyan"><span className="admin-stat-label">Órdenes</span><strong>{customer.ordersCount}</strong></div><div className="admin-stat-card admin-tone-green"><span className="admin-stat-label">Compras acumuladas</span><strong>{adminMoney(customer.paidTotal)}</strong></div><div className="admin-stat-card admin-tone-yellow"><span className="admin-stat-label">Email</span><strong className="admin-stat-small">{customer.emailVerifiedAt ? 'Verificado' : 'Pendiente'}</strong></div></div><section className="admin-panel"><div className="admin-panel-header"><h2>Datos del cliente</h2></div><div className="admin-panel-body"><dl className="admin-definition-list"><dt>ID</dt><dd>{customer.id}</dd><dt>Alta</dt><dd>{adminDate(customer.createdAt, true)}</dd><dt>Última actualización</dt><dd>{adminDate(customer.updatedAt, true)}</dd><dt>Email verificado</dt><dd>{adminDate(customer.emailVerifiedAt, true)}</dd></dl></div></section><section className="admin-customer-orders"><h2>Historial de órdenes</h2>{orders.isError ? <div className="admin-error-panel"><p>{adminErrorMessage(orders.error)}</p></div> : <><AdminDataTable rows={orders.data?.data ?? []} rowKey={(order) => order.id} empty={orders.isLoading ? 'Cargando órdenes…' : 'Este cliente todavía no tiene órdenes.'} columns={[{ key: 'number', header: 'Orden', render: (order) => <Link className="admin-table-link" href={`/admin/orders/${order.number}`}>{order.number}</Link> }, { key: 'date', header: 'Fecha', render: (order) => adminDate(order.createdAt, true) }, { key: 'status', header: 'Estado', render: (order) => <AdminBadge value={order.status} /> }, { key: 'payment', header: 'Pago', render: (order) => <AdminBadge value={order.payment?.status ?? 'PENDING'} /> }, { key: 'total', header: 'Total', align: 'right', render: (order) => <span className="admin-money">{adminMoney(order.totals.total)}</span> }]} /><CursorPagination canPrevious={history.length > 0} canNext={Boolean(orders.data?.nextCursor)} loading={orders.isFetching} onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }} onNext={() => { if (!orders.data?.nextCursor) return; setHistory((current) => [...current, cursor]); setCursor(orders.data.nextCursor ?? undefined); }} /></>}</section></>;
}
