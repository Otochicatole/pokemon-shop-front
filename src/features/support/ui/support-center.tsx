'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Headphones, MessageCircleMore, Plus, RefreshCw } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/feedback';
import { getMe } from '@/features/auth/infrastructure/api';
import { useSupportRealtime } from '@/features/support-realtime';
import { ApiError } from '@/shared/api/client';
import { PendingClientMessageId, supportPayloadFingerprint } from '@/shared/lib/pending-client-message-id';
import { type CreateSupportConversationInput, type SupportConversationStatus, supportStatusLabels } from '../domain/contracts';
import { createSupportConversation, listSupportConversations } from '../infrastructure/api';
import styles from './support.module.css';

type StatusFilter = SupportConversationStatus | 'ALL';

const filterLabels: Record<StatusFilter, string> = {
  ALL: 'Todos',
  OPEN: 'Abiertos',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'Resueltos',
  CLOSED: 'Cerrados',
};

function formatSupportDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.problem.title : error instanceof Error ? error.message : fallback;
}

export function SupportCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const realtime = useSupportRealtime();
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingCreateId] = useState(() => new PendingClientMessageId());
  const session = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const conversations = useInfiniteQuery({
    queryKey: ['support', 'conversations', status],
    enabled: Boolean(session.data),
    retry: false,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listSupportConversations({ cursor: pageParam, status: status === 'ALL' ? undefined : status }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: realtime.connectionState === 'connected' ? false : 30_000,
  });
  const createConversation = useMutation({
    mutationFn: (input: CreateSupportConversationInput) => createSupportConversation(input),
    onSuccess: async (conversation, input) => {
      pendingCreateId.complete(input.clientMessageId);
      setSubject('');
      setMessage('');
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['support'] });
      toast.success('Tu consulta fue creada');
      router.push(`/account/support/${conversation.id}`);
    },
    onError: (error) => setFormError(errorMessage(error, 'No pudimos crear la consulta.')),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (cleanSubject.length < 3) {
      setFormError('El asunto debe tener al menos 3 caracteres.');
      return;
    }
    if (!cleanMessage) {
      setFormError('Contanos brevemente qué problema tuviste.');
      return;
    }
    setFormError(null);
    const payload = { subject: cleanSubject, message: cleanMessage };
    createConversation.mutate({
      ...payload,
      clientMessageId: pendingCreateId.acquire(supportPayloadFingerprint(payload)),
    });
  };

  if (session.isLoading) return <div className="page-loading">Cargando soporte…</div>;
  if (!session.data) {
    return <div className="empty-state">
      <Headphones className="empty-icon" aria-hidden="true" />
      <h1>Soporte</h1>
      <p>Ingresá a tu cuenta para iniciar o continuar una conversación.</p>
      <Link href="/auth/login?returnTo=/account/support" className="button button-primary">Ingresar</Link>
    </div>;
  }

  const items = conversations.data?.pages.flatMap((page) => page.conversations) ?? [];

  return <div className={styles.center}>
    <header className={styles.heading}>
      <div>
        <p className="eyebrow">Ayuda personalizada</p>
        <h1>Centro de soporte</h1>
        <p>Escribinos por cualquier problema. El equipo responde en esta misma conversación.</p>
      </div>
      <Link href="/account" className="button button-ghost">Volver a mi cuenta</Link>
    </header>

    <div className={styles.layout}>
      <section className={styles.newCase} aria-labelledby="new-support-case">
        <div className={styles.panelHeading}>
          <span className={styles.iconBox}><Plus size={18} aria-hidden="true" /></span>
          <div><h2 id="new-support-case">Nueva consulta</h2><p>Creá un chat con nuestro equipo.</p></div>
        </div>
        <form className={styles.form} onSubmit={submit} noValidate>
          <label htmlFor="support-subject">
            <span>Asunto</span>
            <input id="support-subject" value={subject} minLength={3} maxLength={120} autoComplete="off" placeholder="Ej.: problema con mi pedido" onChange={(event) => { pendingCreateId.invalidate(); setSubject(event.target.value); }} disabled={createConversation.isPending} aria-invalid={Boolean(formError && subject.trim().length < 3)} />
            <small aria-hidden="true">{subject.length}/120</small>
          </label>
          <label htmlFor="support-message">
            <span>Mensaje</span>
            <textarea id="support-message" value={message} maxLength={4000} rows={7} placeholder="Incluí los datos que nos ayuden a resolverlo." onChange={(event) => { pendingCreateId.invalidate(); setMessage(event.target.value); }} disabled={createConversation.isPending} aria-invalid={Boolean(formError && !message.trim())} />
            <small aria-hidden="true">{message.length}/4000</small>
          </label>
          {formError && <p className={styles.formError} role="alert">{formError}</p>}
          <Button type="submit" disabled={createConversation.isPending}>{createConversation.isPending ? 'Creando…' : 'Iniciar conversación'}</Button>
        </form>
      </section>

      <section className={styles.history} aria-labelledby="support-history">
        <div className={styles.historyHeading}>
          <div><MessageCircleMore size={20} aria-hidden="true" /><h2 id="support-history">Mis consultas</h2></div>
          <Button variant="ghost" className={styles.refreshButton} onClick={() => void conversations.refetch()} disabled={conversations.isFetching} aria-label="Actualizar consultas"><RefreshCw size={16} aria-hidden="true" />Actualizar</Button>
        </div>
        <label className={styles.filter} htmlFor="support-status-filter"><span>Mostrar</span><select id="support-status-filter" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>{Object.entries(filterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

        {conversations.isLoading ? <div className={styles.listLoading} aria-live="polite">Cargando consultas…</div> : conversations.isError ? <ErrorState title="No pudimos cargar tus consultas" description={errorMessage(conversations.error, 'Intentá nuevamente en unos segundos.')}><Button variant="secondary" onClick={() => void conversations.refetch()}>Reintentar</Button></ErrorState> : items.length ? <div className={styles.list}>
          {items.map((conversation) => <Link className={styles.conversationCard} href={`/account/support/${conversation.id}`} key={conversation.id}>
            <div className={styles.cardTop}>
              <span className={`${styles.status} ${styles[`status${conversation.status}`]}`}>{supportStatusLabels[conversation.status]}</span>
              {conversation.unreadCount > 0 && <span className={styles.unread} aria-label={`${conversation.unreadCount} mensajes sin leer`}>{conversation.unreadCount}</span>}
            </div>
            <strong>{conversation.subject}</strong>
            <p>{conversation.lastMessagePreview ?? 'Conversación iniciada. Esperando mensajes.'}</p>
            <time dateTime={conversation.lastMessageAt ?? conversation.createdAt}><Clock3 size={13} aria-hidden="true" />{formatSupportDate(conversation.lastMessageAt ?? conversation.createdAt)}</time>
          </Link>)}
          {conversations.hasNextPage && <Button variant="secondary" disabled={conversations.isFetchingNextPage} onClick={(event) => { event.preventDefault(); void conversations.fetchNextPage(); }}>{conversations.isFetchingNextPage ? 'Cargando…' : 'Ver consultas anteriores'}</Button>}
        </div> : <div className={styles.emptyHistory}><MessageCircleMore size={30} aria-hidden="true" /><h3>{status === 'ALL' ? 'Todavía no iniciaste consultas' : `No hay casos ${filterLabels[status].toLowerCase()}`}</h3><p>Cuando escribas al equipo, el historial y las respuestas aparecerán acá.</p></div>}
      </section>
    </div>
  </div>;
}
