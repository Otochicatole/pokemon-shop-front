'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, ImagePlus, PackageCheck, Save, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AdminPageHeader, Button, ConfirmDialog, ImageManager, MoneyField, SelectField, TextareaField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge } from '@/shared/admin/format';
import { archiveAdminProduct, createAdminProduct, getAdminProduct, publishAdminProduct, removeProductImage, reorderProductImages, updateAdminProduct, updateProductImage, uploadProductImages } from '../infrastructure/api';
import { productEditorSchema, type ProductEditorValues } from '../domain/contracts';

const defaults: ProductEditorValues = { sku: '', slug: '', name: '', description: '', kind: 'SINGLE_CARD', stockMode: 'UNIQUE', price: '0', initialStock: 0, pokemonType: 'COLORLESS', setName: '', setCode: '', cardNumber: '', rarity: '', language: 'Español', condition: 'NM', finish: '', edition: '', gradingCompany: '', grade: '', certificationNumber: '' };
const pokemonTypes = ['COLORLESS', 'DARKNESS', 'DRAGON', 'FAIRY', 'FIGHTING', 'FIRE', 'GRASS', 'LIGHTNING', 'METAL', 'PSYCHIC', 'WATER'] as const;

function decimalFromMinor(value: string) { return (Number(BigInt(value)) / 100).toFixed(2); }

export function AdminProductEditor({ productId }: { productId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'publish' | 'archive' | null>(null);
  const [removeImageId, setRemoveImageId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const product = useQuery({ queryKey: ['admin', 'product', productId], queryFn: () => getAdminProduct(productId!), enabled: Boolean(productId) });
  const form = useForm<ProductEditorValues>({ resolver: zodResolver(productEditorSchema), defaultValues: defaults });
  const kind = useWatch({ control: form.control, name: 'kind' });
  useEffect(() => {
    if (!product.data) return;
    const value = product.data;
    form.reset({ sku: value.sku, slug: value.slug, name: value.name, description: value.description, kind: value.kind, stockMode: value.stockMode, price: decimalFromMinor(value.price.amountMinor), initialStock: value.inventory.onHand, pokemonType: value.pokemonCard?.pokemonType ?? 'COLORLESS', setName: value.pokemonCard?.setName ?? '', setCode: value.pokemonCard?.setCode ?? '', cardNumber: value.pokemonCard?.cardNumber ?? '', rarity: value.pokemonCard?.rarity ?? '', language: value.pokemonCard?.language ?? 'Español', condition: value.pokemonCard?.condition ?? 'NM', finish: value.pokemonCard?.finish ?? '', edition: value.pokemonCard?.edition ?? '', gradingCompany: value.pokemonCard?.gradingCompany ?? '', grade: value.pokemonCard?.grade ?? '', certificationNumber: value.pokemonCard?.certificationNumber ?? '' });
  }, [form, product.data]);
  useEffect(() => { const protect = (event: BeforeUnloadEvent) => { if (form.formState.isDirty) event.preventDefault(); }; window.addEventListener('beforeunload', protect); return () => window.removeEventListener('beforeunload', protect); }, [form.formState.isDirty]);

  const save = form.handleSubmit(async (values) => {
    try {
      if (productId && product.data) {
        await updateAdminProduct(productId, product.data.version, values);
        await product.refetch(); form.reset(values); toast.success('Producto actualizado');
      } else {
        const created = await createAdminProduct(values);
        const id = created.id;
        toast.success('Borrador creado'); router.replace(`/admin/products/${id}`); router.refresh();
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    } catch (error) { toast.error(adminErrorMessage(error)); }
  });

  const images = useMemo(() => product.data?.images ?? [], [product.data?.images]);
  const moveImage = async (id: string, direction: -1 | 1) => {
    if (!productId) return;
    const ordered = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((item) => item.id === id); const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    if (!product.data) return;
    try { await reorderProductImages(productId, product.data.version, ordered); await product.refetch(); toast.success('Orden de imágenes actualizado'); } catch (error) { toast.error(adminErrorMessage(error)); }
  };
  const upload = async () => {
    if (!productId || !uploadFiles.length) return;
    if (!product.data) return;
    try { await uploadProductImages(productId, product.data.version, uploadFiles, uploadFiles.map(() => product.data?.name ?? '')); setUploadFiles([]); await product.refetch(); toast.success('Imágenes cargadas'); } catch (error) { toast.error(adminErrorMessage(error)); }
  };
  const act = async () => {
    if (!productId || !product.data || !confirmAction) return;
    try { if (confirmAction === 'publish') await publishAdminProduct(productId, product.data.version); else await archiveAdminProduct(productId, product.data.version); setConfirmAction(null); await product.refetch(); await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }); toast.success(confirmAction === 'publish' ? 'Producto publicado' : 'Producto archivado'); } catch (error) { toast.error(adminErrorMessage(error)); }
  };

  if (productId && product.isLoading) return <div className="admin-loading">Cargando editor</div>;
  if (productId && (product.isError || !product.data)) return <div className="admin-error-panel"><div><h1>Producto no disponible</h1><p>{adminErrorMessage(product.error)}</p><Link className="button button-secondary" href="/admin/products">Volver</Link></div></div>;
  return <><AdminPageHeader eyebrow={productId ? `Producto // ${product.data?.sku}` : 'Nuevo registro'} title={productId ? product.data?.name ?? 'Editar producto' : 'Crear producto'} description={productId ? `Versión ${product.data?.version} · actualizado ${adminDate(product.data?.updatedAt, true)}` : 'El producto se guardará inicialmente como borrador.'} actions={<><Link className="button button-secondary" href="/admin/products"><ArrowLeft size={16} />Volver</Link>{product.data && <AdminBadge value={product.data.status} />}</>} />
    <form className="admin-form" onSubmit={save} noValidate><section className="admin-form-section"><h2>Información comercial</h2><div className="admin-form-grid"><TextField label="SKU" error={form.formState.errors.sku?.message} {...form.register('sku')} /><TextField label="Slug" error={form.formState.errors.slug?.message} {...form.register('slug')} /><TextField className="admin-form-span" label="Nombre" error={form.formState.errors.name?.message} {...form.register('name')} /><TextareaField className="admin-form-span" label="Descripción" error={form.formState.errors.description?.message} {...form.register('description')} /><SelectField label="Clase" {...form.register('kind')}><option value="SINGLE_CARD">Carta individual</option><option value="SEALED_PRODUCT">Producto sellado</option><option value="ACCESSORY">Accesorio</option></SelectField><SelectField label="Modo de stock" {...form.register('stockMode')}><option value="UNIQUE">Pieza única</option><option value="QUANTITY">Por cantidad</option></SelectField><MoneyField label="Precio final" error={form.formState.errors.price?.message} {...form.register('price')} />{!productId && <TextField label="Stock inicial" type="number" min={0} max={1_000_000} error={form.formState.errors.initialStock?.message} {...form.register('initialStock', { valueAsNumber: true })} />}</div></section>
      {kind === 'SINGLE_CARD' && <section className="admin-form-section"><h2>Datos de la carta</h2><div className="admin-form-grid"><SelectField label="Tipo / atributo" {...form.register('pokemonType')}>{pokemonTypes.map((type) => <option key={type} value={type}>{type}</option>)}</SelectField><SelectField label="Condición" {...form.register('condition')}><option value="NM">Near Mint</option><option value="EXCELLENT">Excellent</option><option value="GOOD">Good</option><option value="PLAYED">Played</option><option value="DAMAGED">Damaged</option></SelectField><TextField label="Colección / set" error={form.formState.errors.setName?.message} {...form.register('setName')} /><TextField label="Código de set" {...form.register('setCode')} /><TextField label="Número" error={form.formState.errors.cardNumber?.message} {...form.register('cardNumber')} /><TextField label="Rareza" error={form.formState.errors.rarity?.message} {...form.register('rarity')} /><TextField label="Idioma" error={form.formState.errors.language?.message} {...form.register('language')} /><TextField label="Acabado / foil" {...form.register('finish')} /><TextField label="Edición" {...form.register('edition')} /><TextField label="Empresa de grading" {...form.register('gradingCompany')} /><TextField label="Grado" {...form.register('grade')} /><TextField label="Certificación" {...form.register('certificationNumber')} /></div></section>}
      {productId && product.data && <section className="admin-form-section"><div className="admin-panel-header"><h2>Imágenes ({images.length}/8)</h2></div><ImageManager images={images} onMove={(id, direction) => void moveImage(id, direction)} onAltChange={(id, value) => { void updateProductImage(productId, id, product.data.version, value).then(() => product.refetch()).then(() => toast.success('Texto alternativo actualizado')).catch((error) => toast.error(adminErrorMessage(error))); }} onRemove={setRemoveImageId} /><div className="admin-upload-row"><label className="button button-secondary admin-file-trigger"><ImagePlus size={16} />Elegir imágenes<input className="admin-visually-hidden-file" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { const selected = Array.from(event.target.files ?? []); const invalid = selected.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024); if (invalid) { toast.error(`${invalid.name}: formato no admitido o supera 10 MB`); setUploadFiles([]); event.target.value = ''; return; } setUploadFiles(selected); }} /></label><span>{uploadFiles.length ? `${uploadFiles.length} archivo(s) seleccionado(s)` : 'JPEG, PNG o WebP · máximo 8 activas'}</span><Button type="button" variant="secondary" disabled={!uploadFiles.length || images.length + uploadFiles.length > 8} onClick={() => void upload()}><Upload size={16} />Subir</Button></div></section>}
      <footer className="admin-form-footer">{product.data?.status !== 'PUBLISHED' && productId && <Button type="button" variant="secondary" onClick={() => setConfirmAction('publish')}><PackageCheck size={16} />Publicar</Button>}{product.data?.status !== 'ARCHIVED' && productId && <Button type="button" variant="danger" onClick={() => setConfirmAction('archive')}><Archive size={16} />Archivar</Button>}<Button type="submit" disabled={form.formState.isSubmitting}><Save size={16} />{form.formState.isSubmitting ? 'Guardando…' : 'Guardar cambios'}</Button></footer></form>
    <ConfirmDialog open={Boolean(confirmAction)} title={confirmAction === 'publish' ? 'Publicar producto' : 'Archivar producto'} description={confirmAction === 'publish' ? 'El producto quedará visible en el catálogo con el precio y stock actuales.' : 'El producto dejará de mostrarse en la tienda. Las órdenes históricas no se modificarán.'} confirmLabel={confirmAction === 'publish' ? 'Publicar' : 'Archivar'} danger={confirmAction === 'archive'} onClose={() => setConfirmAction(null)} onConfirm={act} />
    <ConfirmDialog open={Boolean(removeImageId)} title="Retirar imagen" description="La imagen dejará de mostrarse en el catálogo. Los snapshots históricos de órdenes conservarán su referencia." confirmLabel="Retirar" onClose={() => setRemoveImageId(null)} onConfirm={async () => { if (!productId || !removeImageId || !product.data) return; try { await removeProductImage(productId, removeImageId, product.data.version); setRemoveImageId(null); await product.refetch(); toast.success('Imagen retirada'); } catch (error) { toast.error(adminErrorMessage(error)); } }} />
  </>;
}
