'use client';

import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock3, Headphones, Send } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/feedback';
import { getMe } from '@/features/auth/infrastructure/api';
import { useSupportRealtime } from '@/features/support-realtime';
import { ApiError } from '@/shared/api/client';
import { PendingClientMessageId, supportPayloadFingerprint } from '@/shared/lib/pending-client-message-id';
import { supportStatusLabels } from '../domain/contracts';
import { getSupportConversation, markSupportConversationRead, sendSupportMessage } from '../infrastructure/api';
import styles from './support.module.css';

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.problem.title : error instanceof Error ? error.message : fallback;
}

export function SupportConversationView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const realtime = useSupportRealtime();
  const [content, setContent] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingSendId] = useState(() => new PendingClientMessageId());
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMarkedRef = useRef<string | null>(null);
  const session = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const conversation = useInfiniteQuery({
    queryKey: ['support', 'conversation', id],
    enabled: Boolean(session.data),
    retry: false,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getSupportConversation(id, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: realtime.connectionState === 'connected' ? false : 30_000,
  });
  const send = useMutation({
    mutationFn: ({ message, clientMessageId }: { message: string; clientMessageId: string }) => sendSupportMessage(id, message, clientMessageId),
    onSuccess: async (_message, input) => {
      pendingSendId.complete(input.clientMessageId);
      setContent('');
      setSendError(null);
      await queryClient.invalidateQueries({ queryKey: ['support'] });
    },
    onError: (error) => setSendError(errorMessage(error, 'No pudimos enviar el mensaje.')),
  });
  const messages = useMemo(() => {
    const byId = new Map((conversation.data?.pages.flatMap((page) => page.messages) ?? []).map((message) => [message.id, message]));
    return [...byId.values()].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }, [conversation.data]);
  const summary = conversation.data?.pages[0]?.conversation;
  const lastMessageId = messages.at(-1)?.id;
  const latestAdminMessageId = [...messages].reverse().find((message) => message.senderType === 'ADMIN')?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [lastMessageId]);

  useEffect(() => {
    if (!latestAdminMessageId || latestAdminMessageId === lastMarkedRef.current) return;
    const markRead = () => {
      if (document.visibilityState !== 'visible' || latestAdminMessageId === lastMarkedRef.current) return;
      lastMarkedRef.current = latestAdminMessageId;
      void markSupportConversationRead(id, latestAdminMessageId)
        .then((result) => {
          queryClient.setQueryData(['support-realtime', 'user', 'unread-count'], result.unreadCount);
          return queryClient.invalidateQueries({ queryKey: ['support', 'conversations'] });
        })
        .catch(() => { lastMarkedRef.current = null; });
    };
    markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => document.removeEventListener('visibilitychange', markRead);
  }, [id, latestAdminMessageId, queryClient]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = content.trim();
    if (!message) {
      setSendError('Escribí un mensaje antes de enviarlo.');
      return;
    }
    setSendError(null);
    const payload = { content: message };
    send.mutate({ message, clientMessageId: pendingSendId.acquire(supportPayloadFingerprint(payload)) });
  };

  if (session.isLoading) return <div className="page-loading">Cargando conversación…</div>;
  if (!session.data) return <div className="empty-state"><Headphones className="empty-icon" aria-hidden="true" /><h1>Iniciá sesión para continuar</h1><Link href={`/auth/login?returnTo=/account/support/${encodeURIComponent(id)}`} className="button button-primary">Ingresar</Link></div>;
  if (conversation.isLoading) return <div className="page-loading">Cargando conversación…</div>;
  if (conversation.isError || !summary) return <ErrorState title="No pudimos abrir esta conversación" description={errorMessage(conversation.error, 'Es posible que no exista o que no tengas acceso.')}><Link href="/account/support" className="button button-secondary">Volver a soporte</Link></ErrorState>;

  const closed = summary.status === 'CLOSED';
  const realtimeLabel = realtime.connectionState === 'connected'
    ? 'Respuestas en vivo activas'
    : realtime.connectionState === 'reconnecting'
      ? 'Reconectando el chat…'
      : realtime.connectionState === 'connecting'
        ? 'Conectando el chat…'
        : 'Actualización periódica';

  return <div className={styles.conversationPage}>
    <header className={styles.conversationHeading}>
      <Link href="/account/support" className="back-link"><ArrowLeft size={15} aria-hidden="true" />Mis consultas</Link>
      <div className={styles.titleRow}>
        <div><p className="eyebrow">Conversación de soporte</p><h1>{summary.subject}</h1></div>
        <span className={`${styles.status} ${styles[`status${summary.status}`]}`}>{supportStatusLabels[summary.status]}</span>
      </div>
      <p className={styles.caseMeta}><Clock3 size={14} aria-hidden="true" />Iniciada el {formatMessageDate(summary.createdAt)}</p>
    </header>

    <section className={styles.chatPanel} aria-label={`Mensajes de ${summary.subject}`}>
      {conversation.hasNextPage && <div className={styles.olderMessages}><Button variant="ghost" disabled={conversation.isFetchingNextPage} onClick={() => void conversation.fetchNextPage()}>{conversation.isFetchingNextPage ? 'Cargando…' : 'Cargar mensajes anteriores'}</Button></div>}
      <div className={styles.messageLog} role="log" aria-live="polite" aria-relevant="additions text">
        {messages.map((message) => {
          const own = message.senderType === 'USER';
          return <article className={`${styles.message} ${own ? styles.messageOwn : styles.messageAdmin}`} key={message.id}>
            <div className={styles.messageAuthor}><strong>{own ? 'Vos' : message.sender.name ?? 'Equipo de soporte'}</strong><time dateTime={message.createdAt}>{formatMessageDate(message.createdAt)}</time></div>
            <p>{message.content}</p>
          </article>;
        })}
        <div ref={bottomRef} />
      </div>

      {closed ? <div className={styles.closedNotice}><strong>Esta conversación está cerrada.</strong><span>Si necesitás más ayuda, podés iniciar una nueva consulta.</span><Link href="/account/support" className="button button-secondary">Nueva consulta</Link></div> : <form className={styles.composer} onSubmit={submit}>
        <label htmlFor="support-reply">Responder</label>
        <div className={styles.composerRow}>
          <textarea id="support-reply" value={content} maxLength={4000} rows={3} placeholder="Escribí tu mensaje…" onChange={(event) => { pendingSendId.invalidate(); setContent(event.target.value); }} disabled={send.isPending} aria-invalid={Boolean(sendError)} />
          <Button type="submit" disabled={send.isPending || !content.trim()} aria-label="Enviar mensaje"><Send size={17} aria-hidden="true" />{send.isPending ? 'Enviando…' : 'Enviar'}</Button>
        </div>
        <div className={styles.composerMeta}><span>{content.length}/4000</span><span className={`${styles.liveState} ${realtime.connectionState === 'connected' ? styles.liveStateConnected : ''}`}><i aria-hidden="true" />{realtimeLabel}</span></div>
        {sendError && <p className={styles.formError} role="alert">{sendError}</p>}
      </form>}
    </section>
  </div>;
}
