'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Mail, Pencil, Phone, Plus, RefreshCw, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminDataTable, AdminPageHeader, Button, ConfirmDialog, CursorPagination, Dialog, TextareaField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge } from '@/shared/admin/format';
import { changeSupplierStatus, editSupplier, listSupplierDirectory, registerSupplier } from '../application';
import { supplierFormSchema, type Supplier, type SupplierFormValues } from '../domain/contracts';

const emptyValues: SupplierFormValues = { name: '', contactName: '', email: '', phone: '', address: '', notes: '' };

function SupplierForm({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier ? {
      name: supplier.name, contactName: supplier.contactName ?? '', email: supplier.email ?? '', phone: supplier.phone ?? '', address: supplier.address ?? '', notes: supplier.notes ?? '',
    } : emptyValues,
  });
  const mutation = useMutation({
    mutationFn: (values: SupplierFormValues) => supplier ? editSupplier(supplier.id, supplier.version, values) : registerSupplier(values),
    onSuccess: async () => { await onSaved(); toast.success(supplier ? 'Proveedor actualizado' : 'Proveedor creado'); onClose(); },
    onError: (error) => form.setError('root', { message: adminErrorMessage(error) }),
  });
  return <form className="admin-dialog-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
    <div className="admin-form-grid">
      <TextField className="admin-form-span" label="Nombre del proveedor" autoFocus error={form.formState.errors.name?.message} {...form.register('name')} />
      <TextField label="Persona de contacto" error={form.formState.errors.contactName?.message} {...form.register('contactName')} />
      <TextField label="Email" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
      <TextField label="Teléfono" type="tel" error={form.formState.errors.phone?.message} {...form.register('phone')} />
      <TextField className="admin-form-span" label="Dirección" error={form.formState.errors.address?.message} {...form.register('address')} />
      <TextareaField className="admin-form-span" label="Notas operativas" error={form.formState.errors.notes?.message} {...form.register('notes')} />
    </div>
    {form.formState.errors.root?.message && <div className="admin-notice is-danger" role="alert">{form.formState.errors.root.message}</div>}
    <div className="admin-dialog-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : supplier ? 'Guardar cambios' : 'Crear proveedor'}</Button></div>
  </form>;
}

export function SupplierManagementView() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', active: 'true' });
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<Array<string | undefined>>([]);
  const [editor, setEditor] = useState<Supplier | null | undefined>();
  const [pendingStatus, setPendingStatus] = useState<Supplier | null>(null);
  const query = useQuery({ queryKey: ['admin', 'suppliers', filters, cursor], queryFn: () => listSupplierDirectory({ ...filters, cursor, limit: 25 }), placeholderData: (previous) => previous });
  const statusMutation = useMutation({
    mutationFn: () => changeSupplierStatus(pendingStatus!.id, !pendingStatus!.active, pendingStatus!.version),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] }); toast.success(pendingStatus?.active ? 'Proveedor desactivado' : 'Proveedor reactivado'); setPendingStatus(null); },
    onError: (error) => { toast.error(adminErrorMessage(error)); setPendingStatus(null); },
  });
  const changeFilter = (key: keyof typeof filters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setCursor(undefined); setHistory([]); };
  const suppliers = query.data?.data ?? [];
  return <>
    <AdminPageHeader eyebrow="Agenda operativa" title="Proveedores" description="Mantené actualizados tus contactos de abastecimiento sin modificar el stock ni el catálogo." actions={<><Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button><Button onClick={() => setEditor(null)}><Plus size={16} />Nuevo proveedor</Button></>} />
    <div className="admin-toolbar supplier-toolbar"><TextField className="admin-search-field" label="Buscar" value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} placeholder="Nombre, contacto, email o teléfono" /><label className="component-field"><span>Estado</span><select value={filters.active} onChange={(event) => changeFilter('active', event.target.value)}><option value="true">Activos</option><option value="">Todos</option><option value="false">Inactivos</option></select></label></div>
    {query.isLoading ? <div className="admin-loading">Cargando proveedores</div> : query.isError ? <div className="admin-error-panel"><div><h2>No pudimos cargar los proveedores</h2><p>{adminErrorMessage(query.error)}</p><Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button></div></div> : <>
      <AdminDataTable caption="Proveedores" rows={suppliers} rowKey={(row) => row.id} empty="No hay proveedores que coincidan con la búsqueda." columns={[
        { key: 'name', header: 'Proveedor', render: (row) => <div><strong>{row.name}</strong><small className="admin-block-muted">Alta: {adminDate(row.createdAt)}</small></div> },
        { key: 'contact', header: 'Contacto', render: (row) => row.contactName || <span className="admin-block-muted">Sin contacto</span> },
        { key: 'email', header: 'Email', render: (row) => row.email ? <a className="admin-table-link supplier-contact" href={`mailto:${row.email}`}><Mail size={14} />{row.email}</a> : <span className="admin-block-muted">—</span> },
        { key: 'phone', header: 'Teléfono', render: (row) => row.phone ? <span className="supplier-contact"><Phone size={14} />{row.phone}</span> : <span className="admin-block-muted">—</span> },
        { key: 'status', header: 'Estado', render: (row) => <AdminBadge value={row.active ? 'ACTIVE' : 'INACTIVE'} /> },
        { key: 'updated', header: 'Actualizado', render: (row) => adminDate(row.updatedAt, true) },
        { key: 'actions', header: 'Acciones', align: 'right', render: (row) => <div className="admin-table-actions"><button className="admin-icon-button" type="button" onClick={() => setEditor(row)} aria-label={`Editar ${row.name}`}><Pencil size={16} /></button><button className={`admin-icon-button supplier-toggle ${row.active ? 'is-active' : 'is-inactive'}`} type="button" onClick={() => setPendingStatus(row)} aria-label={row.active ? `Desactivar ${row.name}` : `Reactivar ${row.name}`}>{row.active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}</button></div> },
      ]} />
      <CursorPagination canPrevious={history.length > 0} canNext={Boolean(query.data?.meta.nextCursor)} loading={query.isFetching} onPrevious={() => { const copy = [...history]; setCursor(copy.pop()); setHistory(copy); }} onNext={() => { const next = query.data?.meta.nextCursor; if (!next) return; setHistory((current) => [...current, cursor]); setCursor(next); }} />
    </>}
    <Dialog open={editor !== undefined} onClose={() => setEditor(undefined)} title={editor ? `Editar ${editor.name}` : 'Nuevo proveedor'} description="Solo el nombre es obligatorio; podés completar el resto de la ficha cuando tengas los datos." className="admin-wide-dialog">{editor !== undefined && <SupplierForm key={editor?.id ?? 'new'} supplier={editor} onClose={() => setEditor(undefined)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] }).then(() => undefined)} />}</Dialog>
    <ConfirmDialog open={Boolean(pendingStatus)} title={pendingStatus?.active ? 'Desactivar proveedor' : 'Reactivar proveedor'} description={pendingStatus?.active ? 'El proveedor quedará fuera de la vista de activos, pero conservará toda su información y podrá reactivarse.' : 'El proveedor volverá a estar disponible en la agenda de activos.'} confirmLabel={pendingStatus?.active ? 'Desactivar' : 'Reactivar'} danger={Boolean(pendingStatus?.active)} onClose={() => !statusMutation.isPending && setPendingStatus(null)} onConfirm={() => void statusMutation.mutateAsync()} />
  </>;
}
