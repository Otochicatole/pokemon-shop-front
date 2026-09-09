'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { AdminDataTable, AdminPageHeader, AdminTabPanel, AdminTabs, Button, CursorPagination } from '@/components';
import { listAdminOrders } from '@/features/order-management';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge, adminMoney } from '@/shared/admin/format';

type Queue = 'TRANSFER_REVIEW' | 'MERCADO_PAGO_REVIEW' | 'ALL';

export function PaymentManagementView({ initialQueue = 'TRANSFER_REVIEW' }: { initialQueue?: Queue }) {
  const [queue, setQueue] = useState<Queue>(initialQueue);
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<Array<string | undefined>>([]);
  const changeQueue = (value: string) => { setQueue(value as Queue); setCursor(undefined); setHistory([]); };
  const query = useQuery({ queryKey: ['admin', 'payments', queue, cursor], queryFn: () => listAdminOrders({ ...(queue === 'ALL' ? {} : { queue }), cursor, limit: 30 }, true), refetchInterval: 30_000 });
  return <><AdminPageHeader eyebrow="Conciliación" title="Pagos" description="Colas operativas separadas. Las aprobaciones, rechazos y reembolsos se resuelven desde la orden para conservar todo el contexto." actions={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>} />
    <AdminTabs id="payment-tabs" active={queue} onChange={changeQueue} label="Colas de pago" tabs={[{ id: 'TRANSFER_REVIEW', label: 'Transferencias' }, { id: 'MERCADO_PAGO_REVIEW', label: 'Mercado Pago' }, { id: 'ALL', label: 'Todos' }]} />
    <AdminTabPanel tabsId="payment-tabs" tabId={queue} active className="admin-tabs-content">{query.isLoading ? <div className="admin-loading">Cargando pagos</div> : query.isError ? <div className="admin-error-panel"><div><h2>No pudimos cargar la cola</h2><p>{adminErrorMessage(query.error)}</p></div></div> : <AdminDataTable rows={query.data?.data ?? []} rowKey={(row) => row.id} caption="Pagos" empty={queue === 'TRANSFER_REVIEW' ? 'No hay transferencias pendientes de revisión.' : queue === 'MERCADO_PAGO_REVIEW' ? 'No hay pagos de Mercado Pago en revisión.' : 'No hay pagos.'} columns={[
      { key: 'order', header: 'Orden', render: (row) => <div><Link className="admin-table-link" href={`/admin/orders/${row.number}`}>{row.number}</Link><small className="admin-block-muted">{adminDate(row.createdAt, true)}</small></div> },
      { key: 'customer', header: 'Cliente', render: (row) => <div>{row.customer.name ?? 'Sin nombre'}<small className="admin-block-muted">{row.customer.email}</small></div> },
      { key: 'method', header: 'Método', render: (row) => <AdminBadge value={row.paymentMethod} /> },
      { key: 'status', header: 'Estado', render: (row) => <AdminBadge value={row.payment?.status ?? 'PENDING'} /> },
      { key: 'reference', header: 'Referencia', render: (row) => row.payment?.bankTransfer?.reference ?? row.payment?.mercadoPago?.externalPaymentId ?? row.payment?.providerReference ?? '—' },
      { key: 'amount', header: 'Monto', align: 'right', render: (row) => <span className="admin-money">{adminMoney(row.payment?.amount ?? row.totals.total)}</span> },
      { key: 'action', header: 'Revisar', align: 'right', render: (row) => <Link className="admin-icon-button" href={`/admin/orders/${row.number}`} aria-label={`Revisar pago de ${row.number}`}><ExternalLink size={17} /></Link> },
    ]} />}{query.data && <CursorPagination canPrevious={history.length > 0} canNext={Boolean(query.data.nextCursor)} loading={query.isFetching} onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }} onNext={() => { if (!query.data.nextCursor) return; setHistory((current) => [...current, cursor]); setCursor(query.data.nextCursor ?? undefined); }} />}</AdminTabPanel>
  </>;
}
