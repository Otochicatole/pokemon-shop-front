'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CheckCircle2, ImagePlus, Save, Search, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/feedback';
import { Button, ConfirmDialog, ImageManager } from '@/components';
import { ApiError } from '@/shared/api/client';
import {
  affiliateListingEditorSchema,
  type AffiliateListing,
  type AffiliateListingEditorValues,
  type PokemonTcgCard,
  type PokemonTcgCardSummary,
} from '../domain/contracts';
import {
  createAffiliateListing,
  deleteAffiliateImage,
  getAffiliatePokemonTcgCard,
  importAffiliatePokemonTcgImage,
  listAffiliatePokemonTcgRarities,
  listAffiliatePokemonTcgSets,
  listingBody,
  reorderAffiliateImages,
  searchAffiliatePokemonTcgCards,
  submitAffiliateListing,
  updateAffiliateImage,
  updateAffiliateListing,
  uploadAffiliateImages,
} from '../infrastructure/api';
import { marketPriceDecimal, pokemonTcgAutofill, pokemonTcgPriceNote, type PokemonTcgMarketPrice } from '@/shared/pokemon-tcg/autofill';
import { PokemonTcgPricePicker } from '@/shared/pokemon-tcg/price-picker';
import { PokemonTcgSearchDialog } from '@/shared/pokemon-tcg/search-dialog';
import { usePokemonTcgSearch } from '@/shared/pokemon-tcg/use-search';
import { raritySelectOptions, usePokemonTcgRarities } from '@/shared/pokemon-tcg/rarities';
import { selectedSetId, setSelectOptions, usePokemonTcgSets } from '@/shared/pokemon-tcg/sets';
import styles from './affiliate-portal.module.css';

const pokemonTypes = ['COLORLESS', 'DARKNESS', 'DRAGON', 'FAIRY', 'FIGHTING', 'FIRE', 'GRASS', 'LIGHTNING', 'METAL', 'PSYCHIC', 'WATER'] as const;

const defaults: AffiliateListingEditorValues = {
  name: '',
  description: '',
  kind: 'SINGLE_CARD',
  stockMode: 'UNIQUE',
  price: '',
  stock: 1,
  pokemonType: undefined,
  setName: '',
  setCode: '',
  cardNumber: '',
  rarity: '',
  language: 'Español',
  condition: 'NM',
  finish: '',
  edition: '',
  gradingCompany: '',
  grade: '',
  certificationNumber: '',
};

type FieldErrors = Partial<Record<keyof AffiliateListingEditorValues, string>>;

function dataError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}

function decimalFromMinor(value: string) {
  return (Number(BigInt(value)) / 100).toFixed(2);
}

function initialPriceFromListing(listing: AffiliateListing) {
  if (!listing.product.priceMinor || listing.product.priceMinor === '0') return '';
  return decimalFromMinor(listing.product.priceMinor);
}

function valuesFromListing(listing: AffiliateListing): AffiliateListingEditorValues {
  const card = listing.product.pokemonCard;
  return {
    name: listing.product.name,
    description: listing.product.description,
    kind: listing.product.kind,
    stockMode: listing.product.stockMode,
    price: initialPriceFromListing(listing),
    stock: listing.product.inventory?.onHand ?? 0,
    pokemonType: card?.pokemonType ?? undefined,
    setName: card?.setName ?? '',
    setCode: card?.setCode ?? '',
    cardNumber: card?.cardNumber ?? '',
    rarity: card?.rarity ?? '',
    language: card?.language ?? 'Español',
    condition: card?.condition ?? 'NM',
    finish: card?.finish ?? '',
    edition: card?.edition ?? '',
    gradingCompany: card?.gradingCompany ?? '',
    grade: card?.grade ?? '',
    certificationNumber: card?.certificationNumber ?? '',
  };
}

function parseEditorValues(values: AffiliateListingEditorValues): { ok: true; values: AffiliateListingEditorValues } | { ok: false; errors: FieldErrors; message: string } {
  const prepared: AffiliateListingEditorValues = {
    ...values,
    name: values.name.trim(),
    description: values.description.trim(),
    price: values.price.trim().replace(',', '.'),
    stock: Number.isFinite(values.stock) ? values.stock : 0,
  };
  const parsed = affiliateListingEditorSchema.safeParse(prepared);
  if (parsed.success) return { ok: true, values: parsed.data };
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in errors)) errors[key as keyof AffiliateListingEditorValues] = issue.message;
  }
  const message = Object.values(errors)[0] ?? 'Revisá los campos marcados antes de guardar';
  return { ok: false, errors, message };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <small className={styles.affiliateFieldError}>{message}</small>;
}

function useListingDraft(initial: AffiliateListingEditorValues | (() => AffiliateListingEditorValues)) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);

  const patch = <K extends keyof AffiliateListingEditorValues>(key: K, value: AffiliateListingEditorValues[K]) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === 'stockMode' && value === 'UNIQUE' && next.stock > 1) next.stock = 1;
      return next;
    });
    setDirty(true);
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const replace = (next: AffiliateListingEditorValues, options?: { dirty?: boolean }) => {
    setValues(next);
    setErrors({});
    setDirty(options?.dirty ?? false);
  };

  return { values, errors, dirty, patch, replace, setErrors, setDirty };
}

export function AffiliateListingCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const draft = useListingDraft(defaults);
  const [pokemonTcgOpen, setPokemonTcgOpen] = useState(false);
  const [pokemonTcgSelectedImage, setPokemonTcgSelectedImage] = useState<string | null>(null);
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [pokemonTcgLoadingId, setPokemonTcgLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pokemonTcgSearch = usePokemonTcgSearch({ open: pokemonTcgOpen, scope: 'affiliate', searchCards: searchAffiliatePokemonTcgCards });
  const { input: pokemonTcgInput, setInput: setPokemonTcgInput, query: pokemonTcgQuery, results: pokemonTcgResults } = pokemonTcgSearch;

  const openPokemonTcg = () => {
    pokemonTcgSearch.reset(draft.values.name);
    setPokemonTcgOpen(true);
  };

  const applyPokemonTcgCard = async (summary: PokemonTcgCardSummary) => {
    setPokemonTcgLoadingId(summary.id);
    try {
      const card: PokemonTcgCard = await getAffiliatePokemonTcgCard(summary.id);
      draft.replace({
        ...draft.values,
        ...pokemonTcgAutofill(card),
      }, { dirty: true });
      setPriceNote(pokemonTcgPriceNote(card));
      setPokemonTcgSelectedImage(card.imageUrl ?? summary.imageUrl);
      setPokemonTcgOpen(false);
      if (card.imageUrl) toast.success('Carta de Pokémon TCG cargada. Revisá el precio y completá los datos faltantes.');
      else toast.warning('Carta de Pokémon TCG cargada sin imagen. Revisá el precio y completá los datos faltantes.');
    } catch (error) {
      toast.error(dataError(error));
    } finally {
      setPokemonTcgLoadingId(null);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseEditorValues(draft.values);
    if (!parsed.ok) {
      draft.setErrors(parsed.errors);
      toast.error(parsed.message);
      return;
    }
    setSaving(true);
    try {
      const created = await createAffiliateListing(parsed.values);
      let version = 1;
      if (pokemonTcgSelectedImage) {
        try {
          const imported = await importAffiliatePokemonTcgImage(created.id, version, pokemonTcgSelectedImage);
          version = imported.version;
          setPokemonTcgSelectedImage(null);
        } catch (error) {
          toast.warning(`Borrador creado, pero no se pudo importar la imagen de Pokémon TCG: ${dataError(error)}`);
        }
      }
      if (files.length) {
        try {
          await uploadAffiliateImages(created.id, version, files);
        } catch (error) {
          toast.warning(`Borrador creado, pero no se pudieron subir algunas imágenes: ${dataError(error)}`);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['affiliate', 'listings'] });
      toast.success('Borrador creado');
      router.push(`/affiliate/listings/${created.id}`);
    } catch (error) {
      toast.error(dataError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AffiliateListingFormShell
        eyebrow="Nueva publicación"
        title="Crear producto"
        description="Completá los mismos datos que en el catálogo de la tienda. El SKU y el slug se generan automáticamente. Guardá el borrador, configurá la logística y envialo a revisión."
        backHref="/affiliate/listings"
        values={draft.values}
        errors={draft.errors}
        onChange={draft.patch}
        saving={saving}
        onSubmit={onSubmit}
        onOpenPokemonTcg={openPokemonTcg}
        onApplyPrice={(price) => {
          const value = marketPriceDecimal(price);
          if (!value) return;
          draft.patch('price', value);
          setPriceNote(pokemonTcgPriceNote({ marketPrice: price }));
        }}
        pokemonTcgSelectedImage={pokemonTcgSelectedImage}
        priceNote={priceNote}
        createFiles={files}
        onCreateFilesChange={setFiles}
      />
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
        errorMessage={pokemonTcgResults.isError ? dataError(pokemonTcgResults.error) : undefined}
        loadingId={pokemonTcgLoadingId}
        onSelect={(card) => void applyPokemonTcgCard(card)}
      />
    </>
  );
}

export function AffiliateListingEditForm({ listing, onSaved }: { listing: AffiliateListing; onSaved: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const listingId = listing.id;
  const productVersionRef = useRef(listing.product.version);
  useEffect(() => { productVersionRef.current = listing.product.version; }, [listing.product.version]);
  const [returning, setReturning] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [removeImageId, setRemoveImageId] = useState<string | null>(null);
  const draft = useListingDraft(() => valuesFromListing(listing));
  const [pokemonTcgOpen, setPokemonTcgOpen] = useState(false);
  const [pokemonTcgSelectedImage, setPokemonTcgSelectedImage] = useState<string | null>(null);
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [pokemonTcgLoadingId, setPokemonTcgLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyImages, setBusyImages] = useState(false);
  const hydratedId = useRef(listingId);

  useEffect(() => {
    if (hydratedId.current === listingId) return;
    hydratedId.current = listingId;
    draft.replace(valuesFromListing(listing));
    setPokemonTcgSelectedImage(null);
    // Solo al cambiar de publicación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (draft.dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [draft.dirty]);

  const canSubmitForReview = listing.status !== 'APPROVED';
  const images = useMemo(
    () => [...listing.product.images].sort((a, b) => a.sortOrder - b.sortOrder),
    [listing.product.images],
  );
  const pokemonTcgSearch = usePokemonTcgSearch({ open: pokemonTcgOpen, scope: 'affiliate', searchCards: searchAffiliatePokemonTcgCards });
  const { input: pokemonTcgInput, setInput: setPokemonTcgInput, query: pokemonTcgQuery, results: pokemonTcgResults } = pokemonTcgSearch;

  const openPokemonTcg = () => {
    pokemonTcgSearch.reset(draft.values.name);
    setPokemonTcgOpen(true);
  };

  const applyPokemonTcgCard = async (summary: PokemonTcgCardSummary) => {
    setPokemonTcgLoadingId(summary.id);
    try {
      const card: PokemonTcgCard = await getAffiliatePokemonTcgCard(summary.id);
      draft.replace({
        ...draft.values,
        ...pokemonTcgAutofill(card),
      }, { dirty: true });
      setPriceNote(pokemonTcgPriceNote(card));
      setPokemonTcgSelectedImage(card.imageUrl ?? summary.imageUrl);
      setPokemonTcgOpen(false);
      if (card.imageUrl) toast.success('Carta de Pokémon TCG cargada. Revisá el precio y completá los datos faltantes.');
      else toast.warning('Carta de Pokémon TCG cargada sin imagen. Revisá el precio y completá los datos faltantes.');
    } catch (error) {
      toast.error(dataError(error));
    } finally {
      setPokemonTcgLoadingId(null);
    }
  };

  const syncListingCache = (values: AffiliateListingEditorValues, result: { version: number; status: AffiliateListing['status'] }) => {
    const priceMinor = String(listingBody(values).priceMinor);
    queryClient.setQueryData<AffiliateListing[]>(['affiliate', 'listings'], (current) => current?.map((row) => {
      if (row.id !== listingId) return row;
      const inventory = row.product.inventory
        ? {
            ...row.product.inventory,
            onHand: values.stock,
            available: Math.max(0, values.stock - row.product.inventory.reserved),
            version: row.product.inventory.version + 1,
          }
        : row.product.inventory;
      return {
        ...row,
        status: result.status,
        reviewNote: null,
        submittedAt: result.status === 'PENDING_REVIEW' ? new Date().toISOString() : null,
        reviewedAt: null,
        product: {
          ...row.product,
          name: values.name.trim(),
          description: values.description.trim(),
          kind: values.kind,
          stockMode: values.stockMode,
          priceMinor,
          status: 'DRAFT',
          version: result.version,
          inventory,
        },
      };
    }));
  };

  const saveListing = async (values: AffiliateListingEditorValues, options?: { submit?: boolean }) => {
    setSaving(true);
    try {
      const expectedVersion = productVersionRef.current;
      const result = await updateAffiliateListing(listingId, expectedVersion, values);
      let imageImported = false;
      let nextVersion = result.version;
      let nextStatus = result.status;
      productVersionRef.current = nextVersion;
      if (pokemonTcgSelectedImage) {
        try {
          const imported = await importAffiliatePokemonTcgImage(listingId, nextVersion, pokemonTcgSelectedImage);
          nextVersion = imported.version;
          productVersionRef.current = nextVersion;
          setPokemonTcgSelectedImage(null);
          imageImported = true;
        } catch (error) {
          toast.warning(`Cambios guardados, pero no se pudo importar la imagen de Pokémon TCG: ${dataError(error)}`);
        }
      }
      syncListingCache(values, { version: nextVersion, status: nextStatus });
      if (options?.submit && ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(nextStatus)) {
        const submitted = await submitAffiliateListing(listingId);
        nextStatus = submitted.status;
        queryClient.setQueryData<AffiliateListing[]>(['affiliate', 'listings'], (current) => current?.map((row) => (
          row.id === listingId ? { ...row, status: submitted.status, submittedAt: new Date().toISOString(), reviewNote: null } : row
        )));
      }
      await queryClient.invalidateQueries({ queryKey: ['affiliate', 'listings'] });
      toast.success(
        options?.submit || nextStatus === 'PENDING_REVIEW'
          ? imageImported
            ? 'Cambios guardados, imagen importada y publicación enviada a revisión.'
            : 'Cambios guardados y enviados a revisión.'
          : imageImported
            ? 'Cambios guardados con imagen de Pokémon TCG'
            : 'Cambios guardados. La publicación volvió a borrador; enviala a revisión cuando esté lista.',
      );
      draft.replace(values);
      onSaved();
    } catch (error) {
      toast.error(dataError(error));
    } finally {
      setSaving(false);
    }
  };

  const runSave = async (event: FormEvent | undefined, options?: { submit?: boolean }) => {
    event?.preventDefault();
    const parsed = parseEditorValues(draft.values);
    if (!parsed.ok) {
      draft.setErrors(parsed.errors);
      toast.error(parsed.message);
      return;
    }
    await saveListing(parsed.values, options);
  };

  const moveImage = async (id: string, direction: -1 | 1) => {
    const ordered = [...images];
    const index = ordered.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setBusyImages(true);
    try {
      await reorderAffiliateImages(listingId, productVersionRef.current, ordered.map((image) => image.id));
      toast.success('Orden de imágenes actualizado');
      onSaved();
    } catch (error) {
      toast.error(dataError(error));
    } finally {
      setBusyImages(false);
    }
  };

  const upload = async () => {
    if (!uploadFiles.length) return;
    setBusyImages(true);
    try {
      await uploadAffiliateImages(listingId, productVersionRef.current, uploadFiles);
      setUploadFiles([]);
      toast.success('Imágenes cargadas');
      onSaved();
    } catch (error) {
      toast.error(dataError(error));
    } finally {
      setBusyImages(false);
    }
  };

  async function goBack() {
    if (returning) return;
    if (draft.dirty && !window.confirm('Hay cambios sin guardar. Si salís ahora, el precio y el resto de ediciones no se envían a revisión.')) return;
    setReturning(true);
    await queryClient.invalidateQueries({ queryKey: ['affiliate', 'listings'] }).catch(() => undefined);
    router.push('/affiliate/listings');
  }

  return (
    <>
      <AffiliateListingFormShell
        eyebrow="Editar publicación"
        title={listing.product.name}
        description={`Estado actual: ${listing.status} · versión ${listing.product.version}. Guardá los cambios antes de enviar a revisión. SKU ${listing.product.sku}`}
        onBack={() => void goBack()}
        backLabel={returning ? 'Cargando…' : 'Volver'}
        backDisabled={saving || busyImages || returning}
        reviewNote={listing.reviewNote}
        values={draft.values}
        errors={draft.errors}
        onChange={draft.patch}
        saving={saving || busyImages}
        onSubmit={(event) => void runSave(event)}
        onSubmitForReview={canSubmitForReview ? () => void runSave(undefined, { submit: true }) : undefined}
        onOpenPokemonTcg={openPokemonTcg}
        onApplyPrice={(price) => {
          const value = marketPriceDecimal(price);
          if (!value) return;
          draft.patch('price', value);
          setPriceNote(pokemonTcgPriceNote({ marketPrice: price }));
        }}
        pokemonTcgSelectedImage={pokemonTcgSelectedImage}
        priceNote={priceNote}
        images={images}
        onMoveImage={(id, direction) => void moveImage(id, direction)}
        onAltChange={(id, value) => {
          void updateAffiliateImage(listingId, id, productVersionRef.current, value)
            .then(() => { toast.success('Texto alternativo actualizado'); onSaved(); })
            .catch((error) => toast.error(dataError(error)));
        }}
        onRemoveImage={setRemoveImageId}
        uploadFiles={uploadFiles}
        onUploadFilesChange={setUploadFiles}
        onUpload={() => void upload()}
        imageBusy={busyImages}
      />
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
        errorMessage={pokemonTcgResults.isError ? dataError(pokemonTcgResults.error) : undefined}
        loadingId={pokemonTcgLoadingId}
        onSelect={(card) => void applyPokemonTcgCard(card)}
      />
      <ConfirmDialog
        open={Boolean(removeImageId)}
        title="Retirar imagen"
        description="La imagen dejará de mostrarse en el catálogo. Los snapshots históricos de órdenes conservarán su referencia."
        confirmLabel="Retirar"
        onClose={() => setRemoveImageId(null)}
        onConfirm={async () => {
          if (!removeImageId) return;
          try {
            await deleteAffiliateImage(listingId, removeImageId, productVersionRef.current);
            setRemoveImageId(null);
            toast.success('Imagen retirada');
            onSaved();
          } catch (error) {
            toast.error(dataError(error));
          }
        }}
      />
    </>
  );
}

type FormShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  reviewNote?: string | null;
  values: AffiliateListingEditorValues;
  errors: FieldErrors;
  onChange: <K extends keyof AffiliateListingEditorValues>(key: K, value: AffiliateListingEditorValues[K]) => void;
  saving: boolean;
  onSubmit: (event: FormEvent) => void;
  onSubmitForReview?: () => void;
  onOpenPokemonTcg: () => void;
  onApplyPrice: (price: PokemonTcgMarketPrice) => void;
  pokemonTcgSelectedImage: string | null;
  priceNote: string | null;
  createFiles?: File[];
  onCreateFilesChange?: (files: File[]) => void;
  images?: AffiliateListing['product']['images'];
  onMoveImage?: (id: string, direction: -1 | 1) => void;
  onAltChange?: (id: string, value: string) => void;
  onRemoveImage?: (id: string) => void;
  uploadFiles?: File[];
  onUploadFilesChange?: (files: File[]) => void;
  onUpload?: () => void;
  imageBusy?: boolean;
};

function AffiliateListingFormShell({
  eyebrow, title, description, backHref, onBack, backLabel = 'Volver', backDisabled, reviewNote,
  values, errors, onChange, saving, onSubmit, onSubmitForReview, onOpenPokemonTcg, onApplyPrice, pokemonTcgSelectedImage, priceNote,
  createFiles, onCreateFilesChange, images, onMoveImage, onAltChange, onRemoveImage,
  uploadFiles, onUploadFilesChange, onUpload, imageBusy,
}: FormShellProps) {
  const { rarities } = usePokemonTcgRarities(listAffiliatePokemonTcgRarities, values.kind === 'SINGLE_CARD');
  const { sets } = usePokemonTcgSets(listAffiliatePokemonTcgSets, values.kind === 'SINGLE_CARD');
  const rarityOptions = useMemo(() => raritySelectOptions(rarities, values.rarity), [rarities, values.rarity]);
  const setOptions = useMemo(() => setSelectOptions(sets, values.setName, values.setCode), [sets, values.setName, values.setCode]);
  const setValueId = selectedSetId(setOptions, values.setName, values.setCode);

  return (
    <>
      <header className={styles.affiliateHeader}>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.affiliateHeaderDescription}>{description}</p>
          {reviewNote ? <p className={styles.affiliateReviewNote}>Nota de revisión: {reviewNote}</p> : null}
        </div>
        <div className={styles.affiliateHeaderAction}>
          {backHref ? (
            <Link className="button button-secondary" href={backHref}><ArrowLeft size={16} />Volver</Link>
          ) : (
            <Button variant="secondary" onClick={onBack} disabled={backDisabled}><ArrowLeft size={16} />{backLabel}</Button>
          )}
        </div>
      </header>
      <section className={styles.affiliatePanel}>
        <form className={styles.affiliateNewForm} onSubmit={onSubmit} noValidate>
          <div className={styles.affiliateEditorSection}>
            <h2>Información comercial</h2>
            <label>
              Nombre
              <input value={values.name} onChange={(event) => onChange('name', event.target.value)} maxLength={180} placeholder="Ej. Charizard VMAX o Booster sellado" />
              <FieldError message={errors.name} />
            </label>
            <label>
              Descripción
              <textarea value={values.description} onChange={(event) => onChange('description', event.target.value)} maxLength={5000} rows={5} placeholder="Contale al comprador qué está ofreciendo…" />
              <FieldError message={errors.description} />
            </label>
            <div className={styles.affiliateFormGrid}>
              <label>
                Clase
                <select value={values.kind} onChange={(event) => onChange('kind', event.target.value as AffiliateListingEditorValues['kind'])}>
                  <option value="SINGLE_CARD">Carta individual</option>
                  <option value="SEALED_PRODUCT">Producto sellado</option>
                  <option value="ACCESSORY">Accesorio</option>
                </select>
              </label>
              <label>
                Modo de stock
                <select value={values.stockMode} onChange={(event) => onChange('stockMode', event.target.value as AffiliateListingEditorValues['stockMode'])}>
                  <option value="UNIQUE">Pieza única</option>
                  <option value="QUANTITY">Por cantidad</option>
                </select>
              </label>
              <div>
                <label>
                  Precio en USD *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="Ej. 15.99"
                    value={values.price}
                    onChange={(event) => onChange('price', event.target.value)}
                    required
                    aria-invalid={Boolean(errors.price)}
                  />
                  <FieldError message={errors.price} />
                </label>
                {values.kind === 'SINGLE_CARD' && <PokemonTcgPricePicker scope="affiliate" cardName={values.name} disabled={saving} onApply={onApplyPrice} />}
              </div>
              <label>
                Stock{values.stockMode === 'UNIQUE' ? ' (máx. 1)' : ''}
                <input
                  type="number"
                  min={0}
                  max={values.stockMode === 'UNIQUE' ? 1 : 1_000_000}
                  step={1}
                  value={Number.isFinite(values.stock) ? values.stock : 0}
                  onChange={(event) => onChange('stock', event.target.value === '' ? 0 : Number(event.target.value))}
                />
                <FieldError message={errors.stock} />
              </label>
            </div>
          </div>

          {values.kind === 'SINGLE_CARD' && (
            <div className={styles.affiliateEditorSection}>
              <div className={styles.affiliateEditorSectionHeading}>
                <h2>Datos de la carta</h2>
                <Button type="button" variant="secondary" onClick={onOpenPokemonTcg}><Search size={16} />Autocompletar con Pokémon TCG</Button>
              </div>
              {pokemonTcgSelectedImage && (
                <p className={styles.affiliateAutofillNote}><Check size={15} />Imagen de Pokémon TCG lista para importarse al guardar.</p>
              )}
              {priceNote && <p className={styles.affiliateAutofillNote} role="status">{priceNote} Revisá los datos autocompletados y completá los campos faltantes.</p>}
              <div className={styles.affiliateFormGrid}>
                <label>
                  Tipo / atributo
                  <select value={values.pokemonType ?? ''} onChange={(event) => onChange('pokemonType', (event.target.value || undefined) as AffiliateListingEditorValues['pokemonType'])}>
                    <option value="">Sin especificar / no aplica</option>
                    {pokemonTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label>
                  Condición
                  <select value={values.condition ?? 'NM'} onChange={(event) => onChange('condition', event.target.value as AffiliateListingEditorValues['condition'])}>
                    <option value="NM">Near Mint</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="PLAYED">Played</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                  <FieldError message={errors.condition} />
                </label>
                <label>
                  Colección / set
                  <select
                    value={setValueId}
                    onChange={(event) => {
                      const selected = setOptions.find((set) => set.id === event.target.value);
                      onChange('setName', selected?.name ?? '');
                      onChange('setCode', selected?.id ?? '');
                    }}
                  >
                    <option value="">Seleccioná set</option>
                    {setOptions.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
                  </select>
                  <FieldError message={errors.setName} />
                </label>
                <label>
                  Código de set
                  <input value={values.setCode ?? ''} onChange={(event) => onChange('setCode', event.target.value)} />
                </label>
                <label>
                  Número
                  <input value={values.cardNumber ?? ''} onChange={(event) => onChange('cardNumber', event.target.value)} />
                  <FieldError message={errors.cardNumber} />
                </label>
                <label>
                  Rareza
                  <select value={values.rarity ?? ''} onChange={(event) => onChange('rarity', event.target.value)}>
                    <option value="">Seleccioná rareza</option>
                    {rarityOptions.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
                  </select>
                  <FieldError message={errors.rarity} />
                </label>
                <label>
                  Idioma
                  <input value={values.language ?? ''} onChange={(event) => onChange('language', event.target.value)} />
                  <FieldError message={errors.language} />
                </label>
                <label>
                  Acabado / foil
                  <input value={values.finish ?? ''} onChange={(event) => onChange('finish', event.target.value)} />
                </label>
                <label>
                  Edición
                  <input value={values.edition ?? ''} onChange={(event) => onChange('edition', event.target.value)} />
                </label>
                <label>
                  Empresa de grading
                  <input value={values.gradingCompany ?? ''} onChange={(event) => onChange('gradingCompany', event.target.value)} />
                </label>
                <label>
                  Grado
                  <input value={values.grade ?? ''} onChange={(event) => onChange('grade', event.target.value)} />
                </label>
                <label>
                  Certificación
                  <input value={values.certificationNumber ?? ''} onChange={(event) => onChange('certificationNumber', event.target.value)} />
                </label>
              </div>
            </div>
          )}

          {onCreateFilesChange && (
            <label>
              Imágenes (hasta 8)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  const invalid = selected.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024);
                  if (invalid) {
                    toast.error(`${invalid.name}: formato no admitido o supera 10 MB`);
                    onCreateFilesChange([]);
                    event.target.value = '';
                    return;
                  }
                  onCreateFilesChange(selected.slice(0, 8));
                }}
              />
              <small>{createFiles?.length ? `${createFiles.length} imagen${createFiles.length === 1 ? '' : 'es'} seleccionada${createFiles.length === 1 ? '' : 's'}` : 'JPEG, PNG o WebP · máximo 8. Una buena foto es obligatoria para enviar a revisión.'}</small>
            </label>
          )}

          {images && onMoveImage && onAltChange && onRemoveImage && onUploadFilesChange && onUpload && (
            <div className={styles.affiliateEditorSection}>
              <div className={styles.affiliateEditorSectionHeading}>
                <h2>Imágenes ({images.length}/8)</h2>
              </div>
              <ImageManager
                images={images}
                disabled={imageBusy || saving}
                onMove={onMoveImage}
                onAltChange={onAltChange}
                onRemove={onRemoveImage}
              />
              {images.length < 8 && (
                <div className={styles.affiliateUploadRow}>
                  <label className={`button button-secondary ${styles.affiliateFileTrigger}`}>
                    <ImagePlus size={16} />
                    <span>Elegir imágenes</span>
                    <input
                      className={styles.affiliateVisuallyHiddenFile}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(event) => {
                        const selected = Array.from(event.target.files ?? []);
                        const invalid = selected.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024);
                        if (invalid) {
                          toast.error(`${invalid.name}: formato no admitido o supera 10 MB`);
                          onUploadFilesChange([]);
                          event.target.value = '';
                          return;
                        }
                        onUploadFilesChange(selected.slice(0, 8 - images.length));
                      }}
                    />
                  </label>
                  <span>{uploadFiles?.length ? `${uploadFiles.length} archivo(s) seleccionado(s)` : 'JPEG, PNG o WebP · máximo 8 activas'}</span>
                  <Button type="button" variant="secondary" disabled={!uploadFiles?.length || images.length + (uploadFiles?.length ?? 0) > 8 || imageBusy} onClick={onUpload}>
                    <Upload size={16} />Subir
                  </Button>
                </div>
              )}
            </div>
          )}

          <p className="form-hint">
            {backHref
              ? 'Las publicaciones nuevas comienzan como borrador. Para enviarlas a revisión necesitás imagen, stock positivo y al menos una opción de entrega activa.'
              : 'Los cambios de precio, stock o contenido solo se aplican al guardar. Si volvés al listado sin guardar, la revisión sigue con los datos anteriores.'}
          </p>
          <div className={styles.affiliateFormFooter}>
            {backHref ? <Link className="button button-ghost" href="/affiliate">Cancelar</Link> : <span>Guardá antes de enviar a revisión desde el listado.</span>}
            {onSubmitForReview && (
              <Button type="button" variant="secondary" disabled={saving} onClick={onSubmitForReview}>
                <CheckCircle2 size={16} />{saving ? 'Guardando…' : 'Guardar y enviar a revisión'}
              </Button>
            )}
            <Button type="submit" disabled={saving}><Save size={16} />{saving ? 'Guardando…' : backHref ? 'Guardar borrador' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </section>
    </>
  );
}
