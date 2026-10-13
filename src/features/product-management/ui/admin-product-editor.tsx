'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, Check, ImagePlus, PackageCheck, Save, Search, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/feedback';
import { AdminPageHeader, Button, ConfirmDialog, ImageManager, MoneyField, SelectField, TextareaField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate, AdminBadge } from '@/shared/admin/format';
import { archiveAdminProduct, createAdminProduct, deleteAdminProduct, getAdminProduct, getPokemonTcgCard, importPokemonTcgImage, listPokemonTcgRarities, listPokemonTcgSets, publishAdminProduct, removeProductImage, reorderProductImages, searchPokemonTcgCards, updateAdminProduct, updateProductImage, uploadProductImages } from '../infrastructure/api';
import { productEditorSchema, type ProductEditorValues, type PokemonTcgCard, type PokemonTcgCardSummary } from '../domain/contracts';
import { pokemonTcgAutofill, pokemonTcgPriceNote } from '@/shared/pokemon-tcg/autofill';
import { PokemonTcgSearchDialog } from '@/shared/pokemon-tcg/search-dialog';
import { usePokemonTcgSearch } from '@/shared/pokemon-tcg/use-search';
import { raritySelectOptions, usePokemonTcgRarities } from '@/shared/pokemon-tcg/rarities';
import { selectedSetId, setSelectOptions, usePokemonTcgSets } from '@/shared/pokemon-tcg/sets';
import styles from './admin-product-editor.module.css';

import shared from '@/components/admin/admin-shared.module.css';
const defaults: ProductEditorValues = { sku: '', slug: '', name: '', description: '', kind: 'SINGLE_CARD', stockMode: 'UNIQUE', price: '0', cost: '0', initialStock: 1, pokemonType: undefined, setName: '', setCode: '', cardNumber: '', rarity: '', language: 'Español', condition: 'NM', finish: '', edition: '', gradingCompany: '', grade: '', certificationNumber: '' };
const pokemonTypes = ['COLORLESS', 'DARKNESS', 'DRAGON', 'FAIRY', 'FIGHTING', 'FIRE', 'GRASS', 'LIGHTNING', 'METAL', 'PSYCHIC', 'WATER'] as const;

function decimalFromMinor(value: string) { return (Number(BigInt(value)) / 100).toFixed(2); }

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

export function AdminProductEditor({ productId }: { productId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openPokemonTcgOnLoad = searchParams.get('autofill') === '1';
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'publish' | 'archive' | 'delete' | null>(null);
  const [removeImageId, setRemoveImageId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [pokemonTcgOpen, setPokemonTcgOpen] = useState(openPokemonTcgOnLoad);
  const [pokemonTcgSelectedImage, setPokemonTcgSelectedImage] = useState<string | null>(null);
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [pokemonTcgLoadingId, setPokemonTcgLoadingId] = useState<string | null>(null);
  const product = useQuery({ queryKey: ['admin', 'product', productId], queryFn: () => getAdminProduct(productId!), enabled: Boolean(productId) });
  const pokemonTcgSearch = usePokemonTcgSearch({ open: pokemonTcgOpen, scope: 'admin', searchCards: searchPokemonTcgCards });
  const { input: pokemonTcgInput, setInput: setPokemonTcgInput, query: pokemonTcgQuery, results: pokemonTcgResults } = pokemonTcgSearch;
  const { rarities } = usePokemonTcgRarities(listPokemonTcgRarities);
  const { sets } = usePokemonTcgSets(listPokemonTcgSets);
  const form = useForm<ProductEditorValues>({ resolver: zodResolver(productEditorSchema), defaultValues: defaults });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const rarityValue = useWatch({ control: form.control, name: 'rarity' });
  const setNameValue = useWatch({ control: form.control, name: 'setName' });
  const setCodeValue = useWatch({ control: form.control, name: 'setCode' });
  const rarityOptions = useMemo(() => raritySelectOptions(rarities, rarityValue), [rarities, rarityValue]);
  const setOptions = useMemo(() => setSelectOptions(sets, setNameValue, setCodeValue), [sets, setNameValue, setCodeValue]);
  const setValueId = selectedSetId(setOptions, setNameValue, setCodeValue);
  useEffect(() => {
    if (!product.data) return;
    const value = product.data;
    form.reset({ sku: value.sku, slug: value.slug, name: value.name, description: value.description, kind: value.kind, stockMode: value.stockMode, price: decimalFromMinor(value.price.amountMinor), cost: decimalFromMinor(value.cost.amountMinor), initialStock: value.inventory.onHand, pokemonType: value.pokemonCard?.pokemonType ?? undefined, setName: value.pokemonCard?.setName ?? '', setCode: value.pokemonCard?.setCode ?? '', cardNumber: value.pokemonCard?.cardNumber ?? '', rarity: value.pokemonCard?.rarity ?? '', language: value.pokemonCard?.language ?? 'Español', condition: value.pokemonCard?.condition ?? 'NM', finish: value.pokemonCard?.finish ?? '', edition: value.pokemonCard?.edition ?? '', gradingCompany: value.pokemonCard?.gradingCompany ?? '', grade: value.pokemonCard?.grade ?? '', certificationNumber: value.pokemonCard?.certificationNumber ?? '' });
  }, [form, product.data]);
  useEffect(() => { const protect = (event: BeforeUnloadEvent) => { if (form.formState.isDirty) event.preventDefault(); }; window.addEventListener('beforeunload', protect); return () => window.removeEventListener('beforeunload', protect); }, [form.formState.isDirty]);

  const openPokemonTcg = () => { pokemonTcgSearch.reset(form.getValues('name')); setPokemonTcgOpen(true); };
  const applyPokemonTcgCard = async (summary: PokemonTcgCardSummary) => {
    setPokemonTcgLoadingId(summary.id);
    try {
      const card: PokemonTcgCard = await getPokemonTcgCard(summary.id);
      const generatedSku = `TCG-${card.id.replace(/[^A-Za-z0-9-]/g, '-').toUpperCase()}`.slice(0, 80);
      form.setValue('sku', generatedSku, { shouldDirty: true, shouldValidate: true });
      form.setValue('slug', slugify(`${card.name}-${card.id}`), { shouldDirty: true, shouldValidate: true });
      const autofill = pokemonTcgAutofill(card);
      for (const key of Object.keys(autofill) as (keyof typeof autofill)[]) {
        form.setValue(key, autofill[key], { shouldDirty: true, shouldValidate: true });
      }
      setPriceNote(pokemonTcgPriceNote(card));
      setPokemonTcgSelectedImage(card.imageUrl ?? summary.imageUrl);
      setPokemonTcgOpen(false);
      if (card.imageUrl) toast.success('Carta de Pokémon TCG cargada. Revisá el precio y completá los datos faltantes.');
      else toast.warning('Carta de Pokémon TCG cargada sin imagen. Revisá el precio y completá los datos faltantes.');
    } catch (error) { toast.error(adminErrorMessage(error)); } finally { setPokemonTcgLoadingId(null); }
  };

  const save = form.handleSubmit(async (values) => {
    try {
      const imageUrl = pokemonTcgSelectedImage;
      if (productId && product.data) {
        const updated = await updateAdminProduct(productId, product.data.version, values);
        let imageImported = false;
        if (imageUrl) {
          try { await importPokemonTcgImage(productId, updated.version, imageUrl); setPokemonTcgSelectedImage(null); imageImported = true; } catch (error) { toast.warning(`Producto actualizado, pero no se pudo importar la imagen: ${adminErrorMessage(error)}`); }
        }
        await product.refetch(); form.reset(values); toast.success(imageImported ? 'Producto actualizado con imagen de Pokémon TCG' : 'Producto actualizado');
      } else {
        const created = await createAdminProduct(values);
        const id = created.id;
        let imageImported = false;
        if (imageUrl) {
          try { await importPokemonTcgImage(id, created.version, imageUrl); setPokemonTcgSelectedImage(null); imageImported = true; } catch (error) { toast.warning(`Borrador creado, pero no se pudo importar la imagen: ${adminErrorMessage(error)}`); }
        }
        toast.success(imageImported ? 'Borrador creado con imagen de Pokémon TCG' : 'Borrador creado'); router.replace(`/admin/products/${id}`); router.refresh();
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
    try {
      if (confirmAction === 'publish') await publishAdminProduct(productId, product.data.version);
      else if (confirmAction === 'archive') await archiveAdminProduct(productId, product.data.version);
      else {
        await deleteAdminProduct(productId, product.data.version);
        setConfirmAction(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
          queryClient.invalidateQueries({ queryKey: ['products'] }),
          queryClient.invalidateQueries({ queryKey: ['catalog-filters'] }),
        ]);
        toast.success('Producto eliminado definitivamente');
        router.replace('/admin/products');
        router.refresh();
        return;
      }
      setConfirmAction(null);
      await product.refetch();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog-filters'] }),
      ]);
      toast.success(confirmAction === 'publish' ? 'Producto publicado' : 'Producto archivado');
    } catch (error) { toast.error(adminErrorMessage(error)); }
  };

  if (productId && product.isLoading) return <div className={shared.adminLoading}>Cargando editor</div>;
  if (productId && (product.isError || !product.data)) return <div className={shared.adminErrorPanel}><div><h1>Producto no disponible</h1><p>{adminErrorMessage(product.error)}</p><Link className="button button-secondary" href="/admin/products">Volver</Link></div></div>;
  return <><AdminPageHeader eyebrow={productId ? `Producto // ${product.data?.sku}` : 'Nuevo registro'} title={productId ? product.data?.name ?? 'Editar producto' : 'Crear producto'} description={productId ? `Versión ${product.data?.version} · actualizado ${adminDate(product.data?.updatedAt, true)}` : 'El producto se guardará inicialmente como borrador.'} actions={<><Link className="button button-secondary" href="/admin/products"><ArrowLeft size={16} />Volver</Link>{product.data && <AdminBadge value={product.data.status} />}</>} />
    <form className={shared.adminForm} onSubmit={save} noValidate><section className={shared.adminFormSection}><h2>Información comercial</h2><div className={shared.adminFormGrid}><TextField label="SKU" error={form.formState.errors.sku?.message} {...form.register('sku')} /><TextField label="Slug" error={form.formState.errors.slug?.message} {...form.register('slug')} /><TextField className={shared.adminFormSpan} label="Nombre" error={form.formState.errors.name?.message} {...form.register('name')} /><TextareaField className={shared.adminFormSpan} label="Descripción" error={form.formState.errors.description?.message} {...form.register('description')} /><SelectField label="Clase" {...form.register('kind')}><option value="SINGLE_CARD">Carta individual</option><option value="SEALED_PRODUCT">Producto sellado</option><option value="ACCESSORY">Accesorio</option></SelectField><SelectField label="Modo de stock" {...form.register('stockMode')}><option value="UNIQUE">Pieza única</option><option value="QUANTITY">Por cantidad</option></SelectField><MoneyField label="Precio de venta" error={form.formState.errors.price?.message} {...form.register('price')} /><MoneyField label="Precio de compra" error={form.formState.errors.cost?.message} {...form.register('cost')} />{!productId && <TextField label="Stock inicial" type="number" min={0} max={1_000_000} error={form.formState.errors.initialStock?.message} {...form.register('initialStock', { valueAsNumber: true })} />}</div></section>
      {kind === 'SINGLE_CARD' && <section className={shared.adminFormSection}><div className={shared.adminFormSectionHeading}><h2>Datos de la carta</h2><Button type="button" variant="secondary" onClick={openPokemonTcg}><Search size={16} />Autocompletar con Pokémon TCG</Button></div>{pokemonTcgSelectedImage && <p className={styles.adminAutofillNote}><Check size={15} />Imagen de Pokémon TCG lista para importarse al guardar.</p>}{priceNote && <p className={styles.adminAutofillNote} role="status">{priceNote} Revisá los datos autocompletados y completá los campos faltantes.</p>}<div className={shared.adminFormGrid}><SelectField label="Tipo / atributo" {...form.register('pokemonType', { setValueAs: (value) => value || undefined })}><option value="">Sin especificar / no aplica</option>{pokemonTypes.map((type) => <option key={type} value={type}>{type}</option>)}</SelectField><SelectField label="Condición" {...form.register('condition')}><option value="NM">Near Mint</option><option value="EXCELLENT">Excellent</option><option value="GOOD">Good</option><option value="PLAYED">Played</option><option value="DAMAGED">Damaged</option></SelectField><SelectField label="Colección / set" error={form.formState.errors.setName?.message} value={setValueId} onChange={(event) => { const selected = setOptions.find((set) => set.id === event.target.value); form.setValue('setName', selected?.name ?? '', { shouldDirty: true, shouldValidate: true }); form.setValue('setCode', selected?.id ?? '', { shouldDirty: true }); }}><option value="">Seleccioná set</option>{setOptions.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}</SelectField><TextField label="Código de set" {...form.register('setCode')} /><TextField label="Número" error={form.formState.errors.cardNumber?.message} {...form.register('cardNumber')} /><SelectField label="Rareza" error={form.formState.errors.rarity?.message} {...form.register('rarity')} value={rarityValue ?? ''}><option value="">Seleccioná rareza</option>{rarityOptions.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}</SelectField><TextField label="Idioma" error={form.formState.errors.language?.message} {...form.register('language')} /><TextField label="Acabado / foil" {...form.register('finish')} /><TextField label="Edición" {...form.register('edition')} /><TextField label="Empresa de grading" {...form.register('gradingCompany')} /><TextField label="Grado" {...form.register('grade')} /><TextField label="Certificación" {...form.register('certificationNumber')} /></div></section>}
      {productId && product.data && <section className={shared.adminFormSection}><div className={shared.adminPanelHeader}><h2>Imágenes ({images.length}/8)</h2></div><ImageManager images={images} onMove={(id, direction) => void moveImage(id, direction)} onAltChange={(id, value) => { void updateProductImage(productId, id, product.data.version, value).then(() => product.refetch()).then(() => toast.success('Texto alternativo actualizado')).catch((error) => toast.error(adminErrorMessage(error))); }} onRemove={setRemoveImageId} /><div className={styles.adminUploadRow}><label className={["button", "button-secondary", styles.adminFileTrigger].filter(Boolean).join(' ')}><ImagePlus size={16} />Elegir imágenes<input className={styles.adminVisuallyHiddenFile} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { const selected = Array.from(event.target.files ?? []); const invalid = selected.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024); if (invalid) { toast.error(`${invalid.name}: formato no admitido o supera 10 MB`); setUploadFiles([]); event.target.value = ''; return; } setUploadFiles(selected); }} /></label><span>{uploadFiles.length ? `${uploadFiles.length} archivo(s) seleccionado(s)` : 'JPEG, PNG o WebP · máximo 8 activas'}</span><Button type="button" variant="secondary" disabled={!uploadFiles.length || images.length + uploadFiles.length > 8} onClick={() => void upload()}><Upload size={16} />Subir</Button></div></section>}
      <footer className={shared.adminFormFooter}>{product.data?.status !== 'PUBLISHED' && productId && <Button type="button" variant="secondary" onClick={() => setConfirmAction('publish')}><PackageCheck size={16} />Publicar</Button>}{product.data?.status !== 'ARCHIVED' && productId && <Button type="button" variant="danger" onClick={() => setConfirmAction('archive')}><Archive size={16} />Archivar</Button>}{product.data?.status === 'ARCHIVED' && productId && <Button type="button" variant="danger" onClick={() => setConfirmAction('delete')}><Trash2 size={16} />Eliminar</Button>}<Button type="submit" disabled={form.formState.isSubmitting}><Save size={16} />{form.formState.isSubmitting ? 'Guardando…' : 'Guardar cambios'}</Button></footer></form>
    <PokemonTcgSearchDialog
      open={pokemonTcgOpen}
      onClose={() => setPokemonTcgOpen(false)}
      input={pokemonTcgInput}
      onInputChange={setPokemonTcgInput}
      onSearch={pokemonTcgSearch.search}
      query={pokemonTcgQuery}
      cards={pokemonTcgResults.data?.data}
      pagination={pokemonTcgResults.data?.meta}
      page={pokemonTcgSearch.page}
      onPageChange={pokemonTcgSearch.changePage}
      onRetry={pokemonTcgSearch.retry}
      isFetching={pokemonTcgResults.isFetching}
      isError={pokemonTcgResults.isError}
      errorMessage={pokemonTcgResults.isError ? adminErrorMessage(pokemonTcgResults.error) : undefined}
      loadingId={pokemonTcgLoadingId}
      onSelect={(card) => void applyPokemonTcgCard(card)}
    />
    <ConfirmDialog open={Boolean(confirmAction)} title={confirmAction === 'publish' ? 'Publicar producto' : confirmAction === 'archive' ? 'Archivar producto' : 'Eliminar producto definitivamente'} description={confirmAction === 'publish' ? 'El producto quedará visible en el catálogo con el precio y stock actuales.' : confirmAction === 'archive' ? 'El producto dejará de mostrarse en la tienda. Las órdenes históricas no se modificarán.' : 'Esta acción es permanente. Solo se puede eliminar un producto archivado sin stock reservado. Si tuvo órdenes, deben estar completadas, canceladas o vencidas.'} confirmLabel={confirmAction === 'publish' ? 'Publicar' : confirmAction === 'archive' ? 'Archivar' : 'Eliminar definitivamente'} danger={confirmAction !== 'publish'} onClose={() => setConfirmAction(null)} onConfirm={act} />
    <ConfirmDialog open={Boolean(removeImageId)} title="Retirar imagen" description="La imagen dejará de mostrarse en el catálogo. Los snapshots históricos de órdenes conservarán su referencia." confirmLabel="Retirar" onClose={() => setRemoveImageId(null)} onConfirm={async () => { if (!productId || !removeImageId || !product.data) return; try { await removeProductImage(productId, removeImageId, product.data.version); setRemoveImageId(null); await product.refetch(); toast.success('Imagen retirada'); } catch (error) { toast.error(adminErrorMessage(error)); } }} />
  </>;
}
