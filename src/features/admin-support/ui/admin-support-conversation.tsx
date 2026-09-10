'use client';

import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock3, MessageSquareReply, RefreshCw, Send, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AdminPageHeader, Button, SelectField } from '@/components';
import { useSupportRealtime } from '@/features/support-realtime';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate } from '@/shared/admin/format';
import { PendingClientMessageId, supportPayloadFingerprint } from '@/shared/lib/pending-client-message-id';
import type { AdminSupportMessage, SupportConversationStatus } from '../domain/contracts';
import {
  getAdminSupportConversation,
  markAdminSupportConversationRead,
  sendAdminSupportMessage,
  updateAdminSupportConversationStatus,
} from '../infrastructure/api';
import { SupportStatusBadge, supportStatusLabel } from './support-status';

function MessageBubble({ message }: { message: AdminSupportMessage }) {
  const own = message.senderType === 'ADMIN';
  return <li className={`admin-support-message ${own ? 'is-admin' : 'is-customer'}`}>
    <div className="admin-support-message-meta"><strong>{own ? 'Equipo de soporte' : message.sender.name?.trim() || 'Cliente'}</strong><time dateTime={message.createdAt}>{adminDate(message.createdAt, true)}</time></div>
    <p>{message.content}</p>
  </li>;
}

export function AdminSupportConversationView({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const realtime = useSupportRealtime();
  const [reply, setReply] = useState('');
  const [pendingSendId] = useState(() => new PendingClientMessageId());
  const [nextStatus, setNextStatus] = useState<SupportConversationStatus | null>(null);
  const lastReadRequested = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: ['admin', 'support', 'conversation', conversationId],
    queryFn: ({ pageParam }) => getAdminSupportConversation(conversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: 30_000,
  });
  const conversation = query.data?.pages[0]?.conversation;
  const messages = useMemo(() => {
    const byId = new Map<string, AdminSupportMessage>();
    query.data?.pages.forEach((page) => page.messages.forEach((message) => byId.set(message.id, message)));
    return [...byId.values()].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }, [query.data]);
  const lastMessageId = messages.at(-1)?.id;
  const lastVisibleMessage = messages.at(-1);

  useEffect(() => {
    if (!lastMessageId) return;
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [lastMessageId]);

  useEffect(() => {
    if (!conversation?.unreadCount || !lastVisibleMessage || lastReadRequested.current === lastVisibleMessage.id) return;
    const markRead = () => {
      if (document.visibilityState !== 'visible' || lastReadRequested.current === lastVisibleMessage.id) return;
      lastReadRequested.current = lastVisibleMessage.id;
      void markAdminSupportConversationRead(conversationId, lastVisibleMessage.id)
        .then(async (result) => {
          queryClient.setQueryData(['support-realtime', 'admin', 'unread-count'], result.unreadCount);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'conversations'] }),
            queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'unread-count'] }),
          ]);
        })
        .catch(() => { lastReadRequested.current = null; });
    };
    markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => document.removeEventListener('visibilitychange', markRead);
  }, [conversation?.unreadCount, conversationId, lastVisibleMessage, queryClient]);

  const send = useMutation({
    mutationFn: ({ content, clientMessageId }: { content: string; clientMessageId: string }) => sendAdminSupportMessage(conversationId, content, clientMessageId),
    onSuccess: async (_message, input) => {
      pendingSendId.complete(input.clientMessageId);
      setReply('');
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'conversations'] }),
      ]);
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const updateStatus = useMutation({
    mutationFn: (status: SupportConversationStatus) => updateAdminSupportConversationStatus(conversationId, status),
    onSuccess: async (updated) => {
      setNextStatus(null);
      toast.success(`Caso marcado como ${supportStatusLabel(updated.status).toLowerCase()}`);
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'conversations'] }),
      ]);
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const canReply = conversation ? conversation.status !== 'CLOSED' : false;
  const submitReply = () => {
    const content = reply.trim();
    if (!content || !canReply || send.isPending) return;
    const payload = { content };
    send.mutate({ content, clientMessageId: pendingSendId.acquire(supportPayloadFingerprint(payload)) });
  };

  if (query.isLoading) return <div className="admin-loading">Cargando conversación</div>;
  if (query.isError || !conversation) return <div className="admin-error-panel"><div><h1>No pudimos cargar la conversación</h1><p>{adminErrorMessage(query.error)}</p><Link className="button button-secondary" href="/admin/support">Volver a soporte</Link></div></div>;

  return <>
    <Link href="/admin/support" className="admin-support-back"><ArrowLeft size={16} />Volver a soporte</Link>
    <AdminPageHeader eyebrow="Conversación de soporte" title={conversation.subject} description={`Caso de ${conversation.user.name?.trim() || conversation.user.email}`} actions={<><Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button><SupportStatusBadge status={conversation.status} /></>} />
    <div className="admin-support-detail-grid">
      <section className="admin-support-chat" aria-label={`Mensajes de ${conversation.subject}`}>
        <header><div><MessageSquareReply size={19} aria-hidden="true" /><span>Historial<strong>{messages.length} mensaje{messages.length === 1 ? '' : 's'}</strong></span></div><span className={`admin-support-live ${realtime.connectionState === 'connected' ? '' : 'is-offline'}`}><i aria-hidden="true" />{realtime.connectionState === 'connected' ? 'Sincronización activa' : realtime.connectionState === 'reconnecting' ? 'Reconectando…' : realtime.connectionState === 'connecting' ? 'Conectando…' : 'Actualización periódica'}</span></header>
        <div className="admin-support-message-list" aria-live="polite">
          {query.hasNextPage && <Button className="admin-support-load-older" type="button" variant="ghost" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Cargando…' : 'Cargar mensajes anteriores'}</Button>}
          {messages.length ? <ol>{messages.map((message) => <MessageBubble key={message.id} message={message} />)}</ol> : <p className="admin-support-no-messages">Esta conversación todavía no tiene mensajes.</p>}
          <div ref={bottomRef} />
        </div>
        <form className="admin-support-composer" onSubmit={(event) => { event.preventDefault(); submitReply(); }}>
          <label htmlFor="admin-support-reply">Responder al cliente</label>
          <textarea id="admin-support-reply" value={reply} maxLength={4000} disabled={!canReply || send.isPending} onChange={(event) => { pendingSendId.invalidate(); setReply(event.target.value); }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitReply(); } }} placeholder={canReply ? 'Escribí una respuesta…' : 'Reabrí el caso para responder.'} />
          <footer><span>{reply.length}/4000 · Enter para enviar, Shift + Enter para nueva línea</span><Button type="submit" disabled={!reply.trim() || !canReply || send.isPending}><Send size={16} />{send.isPending ? 'Enviando…' : 'Enviar'}</Button></footer>
        </form>
      </section>
      <aside className="admin-support-context">
        <section className="admin-panel"><div className="admin-panel-header"><h2>Estado del caso</h2></div><div className="admin-panel-body admin-support-status-control"><SelectField label="Cambiar estado" value={nextStatus ?? conversation.status} onChange={(event) => setNextStatus(event.target.value as SupportConversationStatus)}><option value="OPEN">Abierta</option><option value="IN_PROGRESS">En curso</option><option value="RESOLVED">Resuelta</option><option value="CLOSED">Cerrada</option></SelectField><Button variant="secondary" disabled={!nextStatus || nextStatus === conversation.status || updateStatus.isPending} onClick={() => { if (nextStatus) updateStatus.mutate(nextStatus); }}>{updateStatus.isPending ? 'Guardando…' : 'Actualizar estado'}</Button>{conversation.status === 'CLOSED' && <p>El caso está cerrado. Reabrilo para enviar una respuesta.</p>}</div></section>
        <section className="admin-panel"><div className="admin-panel-header"><h2>Cliente</h2></div><div className="admin-panel-body admin-support-customer-card"><UserRound size={26} aria-hidden="true" /><strong>{conversation.user.name?.trim() || 'Cliente sin nombre'}</strong><a href={`mailto:${conversation.user.email}`}>{conversation.user.email}</a><Link href={`/admin/customers/${conversation.user.id}`}>Abrir ficha del cliente →</Link></div></section>
        <section className="admin-panel"><div className="admin-panel-header"><h2>Información</h2></div><dl className="admin-panel-body admin-definition-list"><div className="admin-definition-row"><dt>Creada</dt><dd>{adminDate(conversation.createdAt, true)}</dd></div><div className="admin-definition-row"><dt>Actualizada</dt><dd>{adminDate(conversation.updatedAt, true)}</dd></div><div className="admin-definition-row"><dt>Iniciada por</dt><dd>{conversation.createdByType === 'ADMIN' ? 'Administración' : 'Cliente'}</dd></div><div className="admin-definition-row"><dt>ID</dt><dd className="admin-code">{conversation.id}</dd></div></dl></section>
        <div className="admin-support-resolution-note"><CheckCircle2 size={19} aria-hidden="true" /><div><strong>Flujo recomendado</strong><span>Tomá el caso, resolvelo y cerralo cuando el cliente ya no necesite seguimiento.</span></div></div>
        <div className="admin-support-time-note"><Clock3 size={17} aria-hidden="true" />Los mensajes nuevos actualizan esta vista automáticamente.</div>
      </aside>
    </div>
  </>;
}
