'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, PackageCheck, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '@/components/feedback';
import { AdminDataTable, AdminPageHeader, Button, ConfirmDialog, CursorPagination, SelectField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminMoney, AdminBadge } from '@/shared/admin/format';
import { archiveAdminProduct, deleteAdminProduct, listAdminProducts, publishAdminProduct } from '../infrastructure/api';
import styles from './admin-product-list.module.css';

import shared from '@/components/admin/admin-shared.module.css';

type BulkAction = 'publish' | 'unarchive' | 'archive' | 'delete';

const bulkCopy: Record<BulkAction, { success: (n: number) => string; title: string; description: (n: number) => string; confirm: string; danger?: boolean }> = {
  publish: {
    success: (n) => `${n} producto(s) publicado(s)`,
    title: 'Publicar productos',
    description: (n) => `Se publicarán ${n} borrador(es). Quedarán visibles en el catálogo con el precio y stock actuales.`,
    confirm: 'Publicar selección',
    danger: false,
  },
  unarchive: {
    success: (n) => `${n} producto(s) desarchivado(s)`,
    title: 'Desarchivar productos',
    description: (n) => `Se desarchivarán ${n} producto(s) y volverán a publicarse en el catálogo.`,
    confirm: 'Desarchivar selección',
    danger: false,
  },
  archive: {
    success: (n) => `${n} producto(s) archivado(s)`,
    title: 'Archivar productos',
    description: (n) => `Se archivarán ${n} producto(s). Dejarán de mostrarse en la tienda. Las órdenes históricas no se modificarán.`,
    confirm: 'Archivar selección',
  },
  delete: {
    success: (n) => `${n} producto(s) eliminado(s)`,
    title: 'Eliminar productos definitivamente',
    description: (n) => `Se eliminarán ${n} producto(s) archivado(s) de forma permanente. Solo se borran si no tienen stock reservado y las órdenes relacionadas están terminales.`,
    confirm: 'Eliminar selección',
  },
};

export function AdminProductListView() {
  const [filters, setFilters] = useState({ search: '', status: '', kind: '', stock: '', pokemonType: '', setName: '' });
  const [cursor, setCursor] = useState<string | undefined>();
  const [history, setHistory] = useState<Array<string | undefined>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'products', filters, cursor],
    queryFn: () => listAdminProducts({ ...filters, cursor, limit: 25 }),
    placeholderData: (previous) => previous,
  });
  const rows = query.data?.data ?? [];

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, cursor]);

  const selectedRows = rows.filter((row) => selectedIds.has(row.id));
  const publishableRows = selectedRows.filter((row) => row.status === 'DRAFT');
  const unarchivableRows = selectedRows.filter((row) => row.status === 'ARCHIVED');
  const archivableRows = selectedRows.filter((row) => row.status !== 'ARCHIVED');
  const deletableRows = unarchivableRows;
  const allPageSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const somePageSelected = rows.some((row) => selectedIds.has(row.id));
  const pageSelectedCount = rows.filter((row) => selectedIds.has(row.id)).length;
  const selectAllState = allPageSelected ? 'all' : somePageSelected ? 'some' : 'none';

  const targetsFor = (action: BulkAction) => {
    if (action === 'publish') return publishableRows;
    if (action === 'unarchive') return unarchivableRows;
    if (action === 'archive') return archivableRows;
    return deletableRows;
  };

  const bulk = useMutation({
    mutationFn: async (action: BulkAction) => {
      const targets = targetsFor(action);
      let succeeded = 0;
      const failures: string[] = [];
      for (const row of targets) {
        try {
          if (action === 'publish' || action === 'unarchive') await publishAdminProduct(row.id, row.version);
          else if (action === 'archive') await archiveAdminProduct(row.id, row.version);
          else await deleteAdminProduct(row.id, row.version);
          succeeded += 1;
        } catch (error) {
          failures.push(`${row.name}: ${adminErrorMessage(error)}`);
        }
      }
      return { action, succeeded, failures, attempted: targets.length };
    },
    onSuccess: async ({ action, succeeded, failures, attempted }) => {
      setBulkAction(null);
      setSelectedIds(new Set());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog-filters'] }),
      ]);
      if (succeeded > 0 && failures.length === 0) {
        toast.success(bulkCopy[action].success(succeeded));
        return;
      }
      if (succeeded > 0) toast.success(`${succeeded} de ${attempted} producto(s) procesado(s)`);
      if (failures.length) toast.error(failures.slice(0, 3).join(' · '));
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });

  const apply = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setCursor(undefined);
    setHistory([]);
  };

  const toggleRow = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) rows.forEach((row) => next.delete(row.id));
      else rows.forEach((row) => next.add(row.id));
      return next;
    });
  };

  const busy = bulk.isPending;

  return (
    <>
      <AdminPageHeader
        eyebrow="Catálogo interno"
        title="Productos"
        description="Creá, publicá y mantené el inventario completo de la tienda."
        actions={
          <>
            <Link className="button button-secondary" href="/admin/products/new?autofill=1">
              <Search size={16} />
              Autocompletar carta
            </Link>
            <Link className="button button-primary" href="/admin/products/new">
              <Plus size={16} />
              Nuevo producto
            </Link>
          </>
        }
      />
      <div className={shared.adminToolbar}>
        <TextField className={shared.adminSearchField} label="Buscar" value={filters.search} onChange={(event) => apply('search', event.target.value)} placeholder="SKU, nombre o slug" />
        <SelectField label="Estado" value={filters.status} onChange={(event) => apply('status', event.target.value)}>
          <option value="">Todos</option>
          <option value="DRAFT">Borradores</option>
          <option value="PUBLISHED">Publicados</option>
          <option value="ARCHIVED">Archivados</option>
        </SelectField>
        <SelectField label="Clase" value={filters.kind} onChange={(event) => apply('kind', event.target.value)}>
          <option value="">Todas</option>
          <option value="SINGLE_CARD">Cartas individuales</option>
          <option value="SEALED_PRODUCT">Sellados</option>
          <option value="ACCESSORY">Accesorios</option>
        </SelectField>
        <SelectField label="Stock" value={filters.stock} onChange={(event) => apply('stock', event.target.value)}>
          <option value="">Todo</option>
          <option value="AVAILABLE">Disponible</option>
          <option value="LOW">Bajo</option>
          <option value="OUT">Sin stock</option>
        </SelectField>
        <SelectField label="Tipo Pokémon" value={filters.pokemonType} onChange={(event) => apply('pokemonType', event.target.value)}>
          <option value="">Todos</option>
          {['COLORLESS', 'DARKNESS', 'DRAGON', 'FAIRY', 'FIGHTING', 'FIRE', 'GRASS', 'LIGHTNING', 'METAL', 'PSYCHIC', 'WATER'].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </SelectField>
        <TextField label="Colección / set" value={filters.setName} onChange={(event) => apply('setName', event.target.value)} />
        <Button className={shared.adminFilterSubmit} variant="secondary" onClick={() => void query.refetch()} aria-label="Actualizar resultados">
          <Search size={16} />
          Buscar
        </Button>
      </div>
      {query.isLoading ? (
        <div className={shared.adminLoading}>Cargando productos</div>
      ) : query.isError ? (
        <div className={shared.adminErrorPanel}>
          <div>
            <h2>No pudimos cargar los productos</h2>
            <p>{adminErrorMessage(query.error)}</p>
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className={styles.bulkBar} role="region" aria-label="Acciones sobre selección">
              <p className={styles.bulkBarCopy}>
                <strong>{selectedIds.size}</strong> seleccionado{selectedIds.size === 1 ? '' : 's'}
              </p>
              <div className={styles.bulkBarActions}>
                <Button type="button" variant="secondary" disabled={busy || publishableRows.length === 0} onClick={() => setBulkAction('publish')}>
                  <PackageCheck size={16} />
                  Publicar{publishableRows.length > 0 ? ` (${publishableRows.length})` : ''}
                </Button>
                <Button type="button" variant="secondary" disabled={busy || unarchivableRows.length === 0} onClick={() => setBulkAction('unarchive')}>
                  <ArchiveRestore size={16} />
                  Desarchivar{unarchivableRows.length > 0 ? ` (${unarchivableRows.length})` : ''}
                </Button>
                <Button type="button" variant="secondary" disabled={busy || archivableRows.length === 0} onClick={() => setBulkAction('archive')}>
                  <Archive size={16} />
                  Archivar{archivableRows.length > 0 ? ` (${archivableRows.length})` : ''}
                </Button>
                <Button type="button" variant="danger" disabled={busy || deletableRows.length === 0} onClick={() => setBulkAction('delete')}>
                  <Trash2 size={16} />
                  Eliminar{deletableRows.length > 0 ? ` (${deletableRows.length})` : ''}
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setSelectedIds(new Set())}>
                  Limpiar
                </Button>
              </div>
            </div>
          )}
          <AdminDataTable
            caption="Productos administrativos"
            rows={rows}
            rowKey={(row) => row.id}
            isRowSelected={(row) => selectedIds.has(row.id)}
            columns={[
              {
                key: 'select',
                headerLabel: 'Seleccionar',
                className: styles.selectCell,
                header: (
                  <label className={styles.selectAll} data-state={selectAllState} title={allPageSelected ? 'Quitar selección de esta página' : 'Seleccionar todos en esta página'}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(element) => {
                        if (element) element.indeterminate = somePageSelected && !allPageSelected;
                      }}
                      onChange={toggleAllPage}
                      disabled={busy || rows.length === 0}
                      aria-label="Seleccionar todos los productos de esta página"
                    />
                    <span className={styles.selectAllMeta} aria-hidden="true">
                      {pageSelectedCount > 0 ? (
                        <span className={styles.selectAllCount}>
                          {pageSelectedCount}/{rows.length}
                        </span>
                      ) : (
                        <span className={styles.selectAllHint}>Todos</span>
                      )}
                    </span>
                  </label>
                ),
                align: 'left',
                render: (row) => (
                  <label className={styles.rowCheck}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      disabled={busy}
                      aria-label={`Seleccionar ${row.name}`}
                    />
                  </label>
                ),
              },
              {
                key: 'product',
                header: 'Producto',
                render: (row) => (
                  <div className={shared.adminTablePrimary}>
                    {row.images[0] ? <Image src={row.images[0].url} alt="" width={46} height={56} unoptimized /> : <span className={shared.adminTableThumb} />}
                    <div>
                      <Link className={shared.adminTableLink} href={`/admin/products/${row.id}`}>
                        {row.name}
                      </Link>
                      <span>
                        {row.sku} · {row.slug}
                      </span>
                    </div>
                  </div>
                ),
              },
              { key: 'kind', header: 'Clase', render: (row) => <AdminBadge value={row.kind} /> },
              { key: 'status', header: 'Estado', render: (row) => <AdminBadge value={row.status} /> },
              { key: 'stock', header: 'Disponible', align: 'center', render: (row) => <strong>{row.inventory.available}</strong> },
              { key: 'price', header: 'Precio', align: 'right', render: (row) => <span className={shared.adminMoney}>{adminMoney(row.price)}</span> },
            ]}
          />
          <CursorPagination
            canPrevious={history.length > 0}
            canNext={Boolean(query.data?.nextCursor)}
            loading={query.isFetching}
            onPrevious={() => {
              const previous = [...history];
              const value = previous.pop();
              setHistory(previous);
              setCursor(value);
            }}
            onNext={() => {
              if (!query.data?.nextCursor) return;
              setHistory((current) => [...current, cursor]);
              setCursor(query.data.nextCursor ?? undefined);
            }}
          />
        </>
      )}
      {bulkAction && (
        <ConfirmDialog
          open
          title={bulkCopy[bulkAction].title}
          description={bulkCopy[bulkAction].description(targetsFor(bulkAction).length)}
          confirmLabel={bulkCopy[bulkAction].confirm}
          danger={bulkCopy[bulkAction].danger !== false}
          busy={bulk.isPending}
          onClose={() => !bulk.isPending && setBulkAction(null)}
          onConfirm={async () => { await bulk.mutateAsync(bulkAction).catch(() => undefined); }}
        />
      )}
    </>
  );
}
