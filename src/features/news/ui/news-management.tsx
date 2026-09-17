'use client';

import { CheckCircle2, Pencil, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/feedback';
import { AdminDataTable, AdminPageHeader, Button, ConfirmDialog, CursorPagination, Dialog, SwitchField, TextareaField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge } from '@/shared/admin/format';
import { createAdminNews, deleteAdminNews, listAdminNews, updateAdminNews } from '../infrastructure/api';
import { newsFormSchema, type AdminNews, type NewsFormValues } from '../domain/contracts';
import styles from './news-management.module.css';

import shared from '@/components/admin/admin-shared.module.css';
function dateInput(value: string | null) { return value ? new Date(value).toISOString().slice(0, 16) : ''; }
function formValues(news?: AdminNews | null): NewsFormValues {
  return { title: news?.title ?? '', summary: news?.summary ?? '', sortOrder: news?.sortOrder ?? 0, active: news?.active ?? false, startsAt: dateInput(news?.startsAt ?? null), endsAt: dateInput(news?.endsAt ?? null) };
}
function currentRowValues(news: AdminNews, active = news.active): NewsFormValues {
  return { ...formValues(news), active };
}

function NewsForm({ news, onClose, onSaved }: { news: AdminNews | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const current = news;
  const [active, setActive] = useState(news?.active ?? false);
  const form = useForm<NewsFormValues>({ resolver: zodResolver(newsFormSchema), defaultValues: formValues(news) });
  const save = useMutation({
    mutationFn: async (values: NewsFormValues) => {
      return current ? updateAdminNews(current.id, current.version, values) : createAdminNews(values);
    },
    onSuccess: async () => { await onSaved(); toast.success(current ? 'Noticia actualizada' : 'Noticia creada como inactiva'); onClose(); },
    onError: (error) => form.setError('root', { message: adminErrorMessage(error) }),
  });
  return (
    <form className={`${shared.adminDialogForm} ${styles.newsDialogForm}`} onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
      <div className={`${shared.adminFormGrid} ${styles.newsFormGrid}`}>
        <TextField className={shared.adminFormSpan} label="Título" maxLength={180} error={form.formState.errors.title?.message} autoFocus {...form.register('title')} />
        <TextareaField className={shared.adminFormSpan} label="Bajada" maxLength={500} rows={5} error={form.formState.errors.summary?.message} hint="Texto informativo; las noticias no tienen enlace ni acción." {...form.register('summary')} />
        <TextField label="Prioridad" type="number" min={0} max={1_000_000} error={form.formState.errors.sortOrder?.message} {...form.register('sortOrder', { valueAsNumber: true })} />
        <div className={styles.newsSwitchField}>
          <SwitchField label="Noticia activa" description="Solo se publica dentro de la ventana configurada." checked={active} onChange={(value) => { setActive(value); form.setValue('active', value, { shouldDirty: true }); }} />
        </div>
        <TextField label="Inicio (UTC)" type="datetime-local" hint="Inclusivo" error={form.formState.errors.startsAt?.message} {...form.register('startsAt')} />
        <TextField label="Fin (UTC)" type="datetime-local" hint="Exclusivo; opcional" error={form.formState.errors.endsAt?.message} {...form.register('endsAt')} />
      </div>
      {form.formState.errors.root?.message && <div className={[shared.adminNotice, styles.isDanger].filter(Boolean).join(' ')} role="alert">{form.formState.errors.root.message}</div>}
      <div className={shared.adminDialogActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={save.isPending}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Guardando…' : current ? 'Guardar cambios' : 'Crear noticia'}</Button>
      </div>
    </form>
  );
}

export function NewsManagementView() {

  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', active: '' });
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<Array<string | undefined>>([]);
  const [editor, setEditor] = useState<AdminNews | null | undefined>();
  const [pendingDelete, setPendingDelete] = useState<AdminNews | null>(null);
  const query = useQuery({ queryKey: ['admin', 'news', filters, cursor], queryFn: () => listAdminNews({ ...filters, cursor, limit: 25 }), placeholderData: (previous) => previous });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'news'] }).then(() => undefined);
  const toggle = useMutation({
    mutationFn: (news: AdminNews) => updateAdminNews(news.id, news.version, currentRowValues(news, !news.active)),
    onSuccess: async () => { await invalidate(); toast.success('Estado de la noticia actualizado'); },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: () => pendingDelete ? deleteAdminNews(pendingDelete.id, pendingDelete.version) : Promise.resolve(),
    onSuccess: async () => { await invalidate(); setPendingDelete(null); toast.success('Noticia eliminada'); },
    onError: (error) => { toast.error(adminErrorMessage(error)); setPendingDelete(null); },
  });
  const changeFilter = (key: keyof typeof filters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setCursor(undefined); setHistory([]); };
  const news = query.data?.data ?? [];
  return <>
    <AdminPageHeader eyebrow="Contenido editorial" title="Noticias" description="Administrá las novedades que aparecen dentro del hero del home, con prioridad y ventana de publicación." actions={<><Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button><Button onClick={() => setEditor(null)}><Plus size={16} />Nueva noticia</Button></>} />
    <div className={`${styles.newsToolbar} ${shared.adminToolbar}`}><TextField className={shared.adminSearchField} label="Buscar" value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} placeholder="Título o bajada" /><label className="component-field"><span>Estado</span><select value={filters.active} onChange={(event) => changeFilter('active', event.target.value)}><option value="">Todas</option><option value="true">Activas</option><option value="false">Inactivas</option></select></label></div>
    {query.isLoading ? <div className={shared.adminLoading}>Cargando noticias</div> : query.isError ? <div className={shared.adminErrorPanel}><div><h2>No pudimos cargar las noticias</h2><p>{adminErrorMessage(query.error)}</p><Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button></div></div> : <>
      <AdminDataTable caption="Noticias editoriales" rows={news} rowKey={(row) => row.id} empty="No hay noticias que coincidan con la búsqueda." columns={[
        { key: 'news', header: 'Noticia', render: (row) => <div className={`${styles.newsTablePrimary} ${shared.adminTablePrimary} ${styles.newsTablePrimary}`}><div><strong>{row.title}</strong><span>{row.summary || 'Sin bajada'}</span></div></div> },
        { key: 'status', header: 'Estado', render: (row) => <AdminBadge value={row.active ? 'ACTIVE' : 'INACTIVE'} /> },
        { key: 'window', header: 'Ventana', render: (row) => <div className={`${styles.newsWindow} ${styles.newsWindow}`}><span>{row.startsAt ? adminDate(row.startsAt, true) : 'Desde ahora'}</span><span>{row.endsAt ? adminDate(row.endsAt, true) : 'Sin vencimiento'}</span></div> },
        { key: 'order', header: 'Orden', align: 'center', render: (row) => <strong>{row.sortOrder}</strong> },
        { key: 'actions', header: 'Acciones', align: 'right', render: (row) => <div className={shared.adminTableActions}><button className={shared.adminIconButton} type="button" onClick={() => setEditor(row)} aria-label={`Editar ${row.title}`}><Pencil size={16} /></button><button className={`${shared.adminIconButton} ${styles.newsToggle} ${row.active ? styles.isActive : styles.isInactive}`} type="button" onClick={() => toggle.mutate(row)} disabled={toggle.isPending} aria-label={row.active ? `Desactivar ${row.title}` : `Activar ${row.title}`}>{row.active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}</button><button className={`${shared.adminIconButton} ${styles.newsDelete}`} type="button" onClick={() => setPendingDelete(row)} aria-label={`Eliminar ${row.title}`}><Trash2 size={16} /></button></div> },
      ]} />
      <CursorPagination canPrevious={history.length > 0} canNext={Boolean(query.data?.meta.nextCursor)} loading={query.isFetching} onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }} onNext={() => { const next = query.data?.meta.nextCursor; if (!next) return; setHistory((current) => [...current, cursor]); setCursor(next); }} />
    </>}
    <Dialog
      open={editor !== undefined}
      onClose={() => setEditor(undefined)}
      title={editor ? 'Editar noticia' : 'Nueva noticia'}
      description={editor ? `Actualizá “${editor.title}”. Las fechas se interpretan en UTC.` : 'Las noticias nuevas comienzan inactivas. Las fechas se interpretan en UTC.'}
      className={`${styles.adminNewsDialog} ${styles.newsDialog}`}
    >
      {editor !== undefined && (
        <NewsForm key={editor?.id ?? 'new'} news={editor} onClose={() => setEditor(undefined)} onSaved={invalidate} />
      )}
    </Dialog>
    <ConfirmDialog open={Boolean(pendingDelete)} title="Eliminar noticia definitivamente" description="Se eliminará la noticia definitivamente. La auditoría se conservará." confirmLabel="Eliminar definitivamente" danger busy={remove.isPending} onClose={() => !remove.isPending && setPendingDelete(null)} onConfirm={() => void remove.mutateAsync()} />
  </>;
}

