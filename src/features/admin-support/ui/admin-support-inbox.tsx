'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, MessageCirclePlus, MessagesSquare, RefreshCw, UserRound } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';
import { AdminDataTable, AdminPageHeader, Button, CursorPagination, Dialog, SelectField, TextareaField, TextField } from '@/components';
import type { AdminCustomer } from '@/features/customer-management/domain/contracts';
import { listAdminCustomers } from '@/features/customer-management/infrastructure/api';
import { useSupportRealtime } from '@/features/support-realtime';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate } from '@/shared/admin/format';
import { PendingClientMessageId, supportPayloadFingerprint } from '@/shared/lib/pending-client-message-id';
import type { CreateAdminSupportConversationInput, SupportConversationStatus } from '../domain/contracts';
import {
  createAdminSupportConversation,
  listAdminSupportConversations,
} from '../infrastructure/api';
import { SupportStatusBadge } from './support-status';

type StatusFilter = SupportConversationStatus | '';

function NewConversationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [customerSearch, setCustomerSearch] = useState('');
  const deferredSearch = useDeferredValue(customerSearch.trim());
  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [pendingCreateId] = useState(() => new PendingClientMessageId());
  const customerQuery = useQuery({
    queryKey: ['admin', 'support', 'customer-search', deferredSearch],
    queryFn: () => listAdminCustomers({ search: deferredSearch, status: 'ACTIVE', limit: 8 }),
    enabled: open && deferredSearch.length >= 2,
    staleTime: 30_000,
  });
  const create = useMutation({
    mutationFn: (input: CreateAdminSupportConversationInput) => createAdminSupportConversation(input),
    onSuccess: async (conversation, input) => {
      pendingCreateId.complete(input.clientMessageId);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
      toast.success('Conversación de soporte creada');
      setCustomerSearch('');
      setCustomer(null);
      setSubject('');
      setMessage('');
      router.push(`/admin/support/${conversation.id}`);
      onClose();
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const resetAndClose = () => {
    if (create.isPending) return;
    setCustomerSearch('');
    setCustomer(null);
    setSubject('');
    setMessage('');
    pendingCreateId.invalidate();
    onClose();
  };
  const canCreate = Boolean(customer && subject.trim().length >= 3 && message.trim().length > 0);
  const submitCreate = () => {
    if (!customer || !canCreate || create.isPending) return;
    const payload = { userId: customer.id, subject: subject.trim(), message: message.trim() };
    create.mutate({ ...payload, clientMessageId: pendingCreateId.acquire(supportPayloadFingerprint(payload)) });
  };

  return <Dialog open={open} title="Nueva conversación" description="Elegí un cliente y dejá el primer mensaje. La conversación aparecerá en tiempo real en su cuenta." className="admin-support-new-dialog" onClose={resetAndClose}>
    <form className="admin-dialog-form" onSubmit={(event) => { event.preventDefault(); submitCreate(); }}>
      {customer ? <div className="admin-support-selected-customer">
        <UserRound size={19} aria-hidden="true" />
        <div><strong>{customer.name?.trim() || 'Cliente sin nombre'}</strong><span>{customer.email}</span></div>
        <button type="button" onClick={() => { pendingCreateId.invalidate(); setCustomer(null); setCustomerSearch(''); }}>Cambiar</button>
      </div> : <>
        <TextField label="Buscar cliente" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Nombre o email" autoComplete="off" hint="Escribí al menos 2 caracteres." />
        {customerQuery.isFetching && <p className="admin-support-search-state">Buscando clientes…</p>}
        {customerQuery.isError && <p className="form-error">{adminErrorMessage(customerQuery.error)}</p>}
        {!customerQuery.isFetching && deferredSearch.length >= 2 && customerQuery.data?.data.length === 0 && <p className="admin-support-search-state">No encontramos clientes activos.</p>}
        {Boolean(customerQuery.data?.data.length) && <ul className="admin-support-customer-results" aria-label="Resultados de clientes">
          {customerQuery.data?.data.map((result) => <li key={result.id}><button type="button" onClick={() => { pendingCreateId.invalidate(); setCustomer(result); }}><strong>{result.name?.trim() || 'Cliente sin nombre'}</strong><span>{result.email}</span></button></li>)}
        </ul>}
      </>}
      <TextField label="Asunto" required minLength={3} maxLength={120} value={subject} onChange={(event) => { pendingCreateId.invalidate(); setSubject(event.target.value); }} placeholder="Ej. Consulta sobre una orden" />
      <TextareaField label="Primer mensaje" required maxLength={4000} value={message} onChange={(event) => { pendingCreateId.invalidate(); setMessage(event.target.value); }} placeholder="Contale al cliente por qué abrís esta conversación…" />
      <div className="admin-dialog-actions"><Button type="button" variant="ghost" onClick={resetAndClose} disabled={create.isPending}>Cancelar</Button><Button type="submit" disabled={!canCreate || create.isPending}><MessageCirclePlus size={16} />{create.isPending ? 'Creando…' : 'Crear chat'}</Button></div>
    </form>
  </Dialog>;
}

export function AdminSupportInboxView() {
  const realtime = useSupportRealtime();
  const [status, setStatus] = useState<StatusFilter>('');
  const [attention, setAttention] = useState<'all' | 'unread'>('all');
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<Array<string | undefined>>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const query = useQuery({
    queryKey: ['admin', 'support', 'conversations', status, cursor],
    queryFn: () => listAdminSupportConversations({ status, cursor, limit: 25 }),
    placeholderData: (previous) => previous,
    refetchInterval: 30_000,
  });
  const conversations = (query.data?.data ?? []).filter((conversation) => attention === 'all' || conversation.unreadCount > 0);
  const changeStatus = (value: StatusFilter) => {
    setStatus(value);
    setCursor(undefined);
    setHistory([]);
  };

  return <>
    <AdminPageHeader eyebrow="Atención al cliente" title="Soporte" description="Respondé consultas en tiempo real y seguí cada caso hasta su resolución." actions={<><Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button><Button onClick={() => setCreateOpen(true)}><MessageCirclePlus size={16} />Nueva conversación</Button></>} />
    <section className="admin-support-summary" aria-label="Resumen de soporte">
      <div><MessagesSquare size={20} aria-hidden="true" /><span>Mensajes sin leer<strong>{realtime.unreadCount}</strong></span></div>
      <div><span>Conversaciones visibles<strong>{conversations.length}</strong></span></div>
      <div><span>Canal<strong>{realtime.connectionState === 'connected' ? 'En línea' : realtime.connectionState === 'reconnecting' ? 'Reconectando' : realtime.connectionState === 'connecting' ? 'Conectando' : 'En espera'}</strong></span></div>
    </section>
    <div className="admin-toolbar admin-support-toolbar">
      <SelectField label="Estado" value={status} onChange={(event) => changeStatus(event.target.value as StatusFilter)}><option value="">Todos</option><option value="OPEN">Abiertas</option><option value="IN_PROGRESS">En curso</option><option value="RESOLVED">Resueltas</option><option value="CLOSED">Cerradas</option></SelectField>
      <SelectField label="Lectura" value={attention} onChange={(event) => setAttention(event.target.value as 'all' | 'unread')}><option value="all">Todas</option><option value="unread">Con mensajes nuevos</option></SelectField>
    </div>
    {query.isLoading ? <div className="admin-loading">Cargando conversaciones</div> : query.isError ? <div className="admin-error-panel"><div><h2>No pudimos cargar soporte</h2><p>{adminErrorMessage(query.error)}</p><Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button></div></div> : <>
      <AdminDataTable rows={conversations} rowKey={(row) => row.id} caption="Conversaciones de soporte" empty={attention === 'unread' ? 'No hay mensajes nuevos en esta página.' : 'Todavía no hay conversaciones de soporte.'} columns={[
        { key: 'subject', header: 'Conversación', render: (row) => <div className="admin-support-subject"><Link className="admin-table-link" href={`/admin/support/${row.id}`}>{row.subject}</Link><small className="admin-block-muted">{row.lastMessagePreview}</small></div> },
        { key: 'customer', header: 'Cliente', render: (row) => <div><strong>{row.user.name?.trim() || 'Sin nombre'}</strong><small className="admin-block-muted">{row.user.email}</small></div> },
        { key: 'status', header: 'Estado', render: (row) => <SupportStatusBadge status={row.status} /> },
        { key: 'unread', header: 'Nuevos', align: 'center', render: (row) => row.unreadCount > 0 ? <span className="admin-support-unread" aria-label={`${row.unreadCount} mensajes sin leer`}>{row.unreadCount}</span> : <span className="admin-muted">—</span> },
        { key: 'activity', header: 'Última actividad', render: (row) => adminDate(row.lastMessageAt, true) },
        { key: 'action', header: 'Abrir', align: 'right', render: (row) => <Link className="admin-icon-button" href={`/admin/support/${row.id}`} aria-label={`Abrir conversación ${row.subject}`}><Eye size={17} /></Link> },
      ]} />
      <CursorPagination canPrevious={history.length > 0} canNext={Boolean(query.data?.nextCursor)} loading={query.isFetching} onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }} onNext={() => { if (!query.data?.nextCursor) return; setHistory((current) => [...current, cursor]); setCursor(query.data.nextCursor ?? undefined); }} />
    </>}
    <NewConversationDialog open={createOpen} onClose={() => setCreateOpen(false)} />
  </>;
}
