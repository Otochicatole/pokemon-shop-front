'use client';
/* TCGdex image URLs are selected at runtime and are intentionally rendered as remote previews. */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ImagePlus, LoaderCircle, Plus, Save, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { AdminPageHeader, Button, Dialog, MoneyField, SelectField, TextareaField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { getAdminProduct, getTcgdexCard, importTcgdexImage, searchTcgdexCards } from '@/features/product-management/infrastructure/api';
import type { TcgDexCard, TcgDexCardSummary } from '@/features/product-management/domain/contracts';
import { loadSupplier, registerPurchase } from '../application';
import { purchaseFormSchema, type PurchaseLineFormValues } from '../domain/contracts';
import styles from './supplier-purchase-form.module.css';
import shared from '@/components/admin/admin-shared.module.css';

const pokemonTypes = ['COLORLESS', 'DARKNESS', 'DRAGON', 'FAIRY', 'FIGHTING', 'FIRE', 'GRASS', 'LIGHTNING', 'METAL', 'PSYCHIC', 'WATER'] as const;

type PurchaseLineState = PurchaseLineFormValues & { tcgdexImageUrl?: string | null };

function dateInputValue(value = new Date()) {
  return value.toISOString().slice(0, 16);
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

function pokemonTypeFromTcgdex(value?: string) {
  const normalized = (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (normalized.includes('DARK') || normalized.includes('OSCUR')) return 'DARKNESS';
  if (normalized.includes('DRAGON')) return 'DRAGON';
  if (normalized.includes('FAIRY') || normalized.includes('HADA')) return 'FAIRY';
  if (normalized.includes('FIGHT') || normalized.includes('LUCH')) return 'FIGHTING';
  if (normalized.includes('FIRE') || normalized.includes('FUEG')) return 'FIRE';
  if (normalized.includes('GRASS') || normalized.includes('PLANT')) return 'GRASS';
  if (normalized.includes('LIGHT') || normalized.includes('RAYO')) return 'LIGHTNING';
  if (normalized.includes('METAL')) return 'METAL';
  if (normalized.includes('PSYCH') || normalized.includes('PSIQU')) return 'PSYCHIC';
  if (normalized.includes('WATER') || normalized.includes('AGUA')) return 'WATER';
  return 'COLORLESS';
}

function emptyLine(): PurchaseLineState {
  return {
    productId: undefined,
    sku: '',
    slug: '',
    name: '',
    description: '',
    kind: 'SINGLE_CARD',
    stockMode: 'UNIQUE',
    price: '0',
    pokemonType: 'COLORLESS',
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
    quantity: 1,
    unitCost: '0',
    tcgdexImageUrl: null,
  };
}

function toFormLine(line: PurchaseLineState): PurchaseLineFormValues {
  const { tcgdexImageUrl: _image, ...rest } = line;
  return rest;
}

export function SupplierPurchaseFormView({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supplier = useQuery({ queryKey: ['admin', 'suppliers', supplierId], queryFn: () => loadSupplier(supplierId) });
  const [purchasedAt, setPurchasedAt] = useState(dateInputValue());
  const [note, setNote] = useState('');
  const [items, setItems] = useState<PurchaseLineState[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [tcgdexLine, setTcgdexLine] = useState<number | null>(null);
  const [tcgdexInput, setTcgdexInput] = useState('');
  const [tcgdexQuery, setTcgdexQuery] = useState('');
  const [tcgdexLoadingId, setTcgdexLoadingId] = useState<string | null>(null);

  const tcgdexResults = useQuery({
    queryKey: ['admin', 'tcgdex', 'purchase', tcgdexQuery],
    queryFn: () => searchTcgdexCards(tcgdexQuery),
    enabled: tcgdexLine !== null && tcgdexQuery.length >= 2,
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = purchaseFormSchema.safeParse({ purchasedAt, note, items: items.map(toFormLine) });
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(first?.message ?? 'Revisá los datos de la compra');
      }
      const purchase = await registerPurchase(supplierId, parsed.data);
      const imageFailures: string[] = [];
      await Promise.all(items.map(async (line, index) => {
        const imageUrl = line.tcgdexImageUrl;
        const productId = purchase.items[index]?.productId;
        if (!imageUrl || !productId) return;
        try {
          const product = await getAdminProduct(productId);
          await importTcgdexImage(productId, product.version, imageUrl);
        } catch {
          imageFailures.push(line.name || line.sku || `Línea ${index + 1}`);
        }
      }));
      return { purchase, imageFailures };
    },
    onSuccess: async ({ imageFailures }) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers', supplierId, 'purchases'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      if (imageFailures.length) {
        toast.warning(`Compra registrada, pero no se pudo importar la imagen de: ${imageFailures.join(', ')}`);
      } else {
        toast.success('Compra registrada');
      }
      router.push(`/admin/suppliers/${supplierId}`);
      router.refresh();
    },
    onError: (err) => setError(err instanceof Error && !('code' in err) ? err.message : adminErrorMessage(err)),
  });

  const updateLine = (index: number, patch: Partial<PurchaseLineState>) => {
    setItems((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const openTcgdex = (index: number) => {
    setTcgdexLine(index);
    setTcgdexInput(items[index]?.name ?? '');
    setTcgdexQuery('');
  };

  const applyTcgdexCard = async (summary: TcgDexCardSummary) => {
    if (tcgdexLine === null) return;
    const lineIndex = tcgdexLine;
    setTcgdexLoadingId(summary.id);
    // Cerrar el diálogo primero para que el formulario quede editable de inmediato.
    setTcgdexLine(null);
    setTcgdexQuery('');
    try {
      const card: TcgDexCard = await getTcgdexCard(summary.id);
      const generatedSku = `TCG-${card.id.replace(/[^A-Za-z0-9-]/g, '-').toUpperCase()}`.slice(0, 80);
      updateLine(lineIndex, {
        productId: undefined,
        sku: generatedSku,
        slug: slugify(`${card.name}-${card.id}`),
        name: card.name,
        description: card.description || card.effect || `Carta Pokémon ${card.name} de ${card.setName}.`,
        kind: 'SINGLE_CARD',
        pokemonType: pokemonTypeFromTcgdex(card.types[0]),
        setName: card.setName,
        setCode: card.setCode,
        cardNumber: card.localId,
        rarity: card.rarity || 'Sin rareza',
        language: card.language,
        condition: 'NM',
        finish: card.holo ? 'Holo' : 'Normal',
        edition: card.firstEdition ? '1.ª edición' : '',
        tcgdexImageUrl: card.imageUrl ?? summary.imageUrl,
      });
      if (card.imageUrl ?? summary.imageUrl) toast.success('Datos e imagen de TCGdex cargados. Solo falta definir precio y costo.');
      else toast.warning('Datos de TCGdex cargados; esta carta no tiene imagen disponible. Solo falta definir precio y costo.');
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setTcgdexLoadingId(null);
    }
  };

  if (supplier.isLoading) return <div className={shared.adminLoading}>Cargando proveedor</div>;
  if (supplier.isError || !supplier.data) {
    return (
      <div className={shared.adminErrorPanel}>
        <div>
          <h2>No pudimos cargar el proveedor</h2>
          <p>{adminErrorMessage(supplier.error)}</p>
          <Button variant="secondary" onClick={() => void supplier.refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow={`Proveedor // ${supplier.data.name}`}
        title="Registrar compra"
        description="Completá los datos de cada producto (como al crear uno). Podés autocompletar con TCGdex. La compra no suma stock."
        actions={
          <Link className="button button-secondary" href={`/admin/suppliers/${supplierId}`}>
            <ArrowLeft size={16} />Volver al proveedor
          </Link>
        }
      />
      <form
        className={shared.adminForm}
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void save.mutateAsync().catch(() => undefined);
        }}
        noValidate
      >
        <section className={shared.adminFormSection}>
          <h2>Datos de la compra</h2>
          <div className={shared.adminFormGrid}>
            <TextField label="Fecha de compra (UTC)" type="datetime-local" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} />
            <TextareaField className={shared.adminFormSpan} label="Nota" value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
          </div>
        </section>

        <section className={shared.adminFormSection}>
          <h2>Productos</h2>
          <div className={styles.lines}>
            {items.map((line, index) => (
              <div key={index} className={styles.lineCard}>
                <div className={styles.lineMeta}>
                  <strong>Línea {index + 1}</strong>
                  <span className={shared.adminMuted}>Se crea en borrador, sin stock</span>
                </div>
                <div className={shared.adminFormGrid}>
                  <TextField id={`purchase-${index}-sku`} label="SKU" value={line.sku} onChange={(event) => updateLine(index, { sku: event.target.value })} />
                  <TextField id={`purchase-${index}-slug`} label="Slug" value={line.slug} onChange={(event) => updateLine(index, { slug: event.target.value })} />
                  <TextField id={`purchase-${index}-name`} className={shared.adminFormSpan} label="Nombre" value={line.name} onChange={(event) => updateLine(index, { name: event.target.value })} />
                  <TextareaField id={`purchase-${index}-description`} className={shared.adminFormSpan} label="Descripción" value={line.description} rows={3} onChange={(event) => updateLine(index, { description: event.target.value })} />
                  <SelectField id={`purchase-${index}-kind`} label="Clase" value={line.kind} onChange={(event) => updateLine(index, { kind: event.target.value as PurchaseLineFormValues['kind'] })}>
                    <option value="SINGLE_CARD">Carta individual</option>
                    <option value="SEALED_PRODUCT">Producto sellado</option>
                    <option value="ACCESSORY">Accesorio</option>
                  </SelectField>
                  <SelectField id={`purchase-${index}-stockMode`} label="Modo de stock" value={line.stockMode} onChange={(event) => updateLine(index, { stockMode: event.target.value as PurchaseLineFormValues['stockMode'] })}>
                    <option value="UNIQUE">Pieza única</option>
                    <option value="QUANTITY">Por cantidad</option>
                  </SelectField>
                  <MoneyField id={`purchase-${index}-price`} label="Precio de venta" value={line.price} onChange={(event) => updateLine(index, { price: event.target.value })} />
                  <TextField id={`purchase-${index}-quantity`} label="Cantidad comprada" type="number" min={1} value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) || 1 })} />
                  <MoneyField id={`purchase-${index}-unitCost`} label="Costo unitario" value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: event.target.value })} />
                </div>
                {line.kind === 'SINGLE_CARD' && (
                  <div className={styles.cardFields}>
                    <div className={styles.cardFieldsHeading}>
                      <h3>Datos de la carta</h3>
                      <Button type="button" variant="secondary" onClick={() => openTcgdex(index)}>
                        <Search size={16} />Autocompletar con TCGdex
                      </Button>
                    </div>
                    {line.tcgdexImageUrl ? (
                      <p className={styles.autofillNote}><Check size={15} />Imagen de TCGdex lista para importarse al guardar. El precio y el costo siguen siendo manuales.</p>
                    ) : null}
                    <div className={shared.adminFormGrid}>
                      <SelectField id={`purchase-${index}-pokemonType`} label="Tipo / atributo" value={line.pokemonType ?? 'COLORLESS'} onChange={(event) => updateLine(index, { pokemonType: event.target.value as PurchaseLineFormValues['pokemonType'] })}>
                        {pokemonTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </SelectField>
                      <SelectField id={`purchase-${index}-condition`} label="Condición" value={line.condition ?? 'NM'} onChange={(event) => updateLine(index, { condition: event.target.value as PurchaseLineFormValues['condition'] })}>
                        <option value="NM">Near Mint</option>
                        <option value="EXCELLENT">Excellent</option>
                        <option value="GOOD">Good</option>
                        <option value="PLAYED">Played</option>
                        <option value="DAMAGED">Damaged</option>
                      </SelectField>
                      <TextField id={`purchase-${index}-setName`} label="Colección / set" value={line.setName ?? ''} onChange={(event) => updateLine(index, { setName: event.target.value })} />
                      <TextField id={`purchase-${index}-setCode`} label="Código de set" value={line.setCode ?? ''} onChange={(event) => updateLine(index, { setCode: event.target.value })} />
                      <TextField id={`purchase-${index}-cardNumber`} label="Número" value={line.cardNumber ?? ''} onChange={(event) => updateLine(index, { cardNumber: event.target.value })} />
                      <TextField id={`purchase-${index}-rarity`} label="Rareza" value={line.rarity ?? ''} onChange={(event) => updateLine(index, { rarity: event.target.value })} />
                      <TextField id={`purchase-${index}-language`} label="Idioma" value={line.language ?? ''} onChange={(event) => updateLine(index, { language: event.target.value })} />
                      <TextField id={`purchase-${index}-finish`} label="Acabado / foil" value={line.finish ?? ''} onChange={(event) => updateLine(index, { finish: event.target.value })} />
                      <TextField id={`purchase-${index}-edition`} label="Edición" value={line.edition ?? ''} onChange={(event) => updateLine(index, { edition: event.target.value })} />
                      <TextField id={`purchase-${index}-gradingCompany`} label="Empresa de grading" value={line.gradingCompany ?? ''} onChange={(event) => updateLine(index, { gradingCompany: event.target.value })} />
                      <TextField id={`purchase-${index}-grade`} label="Grado" value={line.grade ?? ''} onChange={(event) => updateLine(index, { grade: event.target.value })} />
                      <TextField id={`purchase-${index}-certification`} label="Certificación" value={line.certificationNumber ?? ''} onChange={(event) => updateLine(index, { certificationNumber: event.target.value })} />
                    </div>
                  </div>
                )}
                {items.length > 1 && (
                  <button type="button" className={styles.removeLine} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
                    Quitar línea
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {error && <div className={[shared.adminNotice, styles.isDanger].filter(Boolean).join(' ')} role="alert">{error}</div>}
        <footer className={shared.adminFormFooter}>
          <Button
            type="button"
            variant="secondary"
            className={styles.footerAdd}
            onClick={() => setItems((current) => [...current, emptyLine()])}
          >
            <Plus size={16} />Agregar línea
          </Button>
          <Link className="button button-secondary" href={`/admin/suppliers/${supplierId}`}>Cancelar</Link>
          <Button type="submit" disabled={save.isPending}>
            <Save size={16} />{save.isPending ? 'Guardando…' : 'Registrar compra'}
          </Button>
        </footer>
      </form>

      <Dialog
        open={tcgdexLine !== null}
        onClose={() => setTcgdexLine(null)}
        title="Autocompletar carta"
        description="Buscá una carta en TCGdex. Se completarán los datos e imagen; el precio y el costo siempre los definís vos."
        className={shared.adminWideDialog}
      >
        <form
          className={styles.tcgdexSearch}
          onSubmit={(event) => {
            event.preventDefault();
            setTcgdexQuery(tcgdexInput.trim());
          }}
        >
          <TextField label="Nombre o parte del nombre" value={tcgdexInput} onChange={(event) => setTcgdexInput(event.target.value)} placeholder="Ej.: Pikachu" autoFocus />
          <Button type="submit" disabled={tcgdexInput.trim().length < 2 || tcgdexResults.isFetching}>
            <Search size={16} />{tcgdexResults.isFetching ? 'Buscando…' : 'Buscar carta'}
          </Button>
        </form>
        {tcgdexResults.isError && <p className="form-error">{adminErrorMessage(tcgdexResults.error)}</p>}
        {tcgdexResults.isFetching && <div className={shared.adminLoading}>Consultando TCGdex</div>}
        {!tcgdexResults.isFetching && tcgdexQuery && !tcgdexResults.data?.length && (
          <div className={shared.adminTableEmpty}>No encontramos cartas con esa búsqueda.</div>
        )}
        {tcgdexResults.data && tcgdexResults.data.length > 0 && (
          <div className={styles.tcgdexResults} aria-label="Resultados de cartas TCGdex">
            {tcgdexResults.data.map((card) => (
              <button
                type="button"
                key={card.id}
                className={styles.tcgdexResult}
                onClick={() => void applyTcgdexCard(card)}
                disabled={Boolean(tcgdexLoadingId)}
              >
                <span className={styles.tcgdexResultImage}>
                  {card.imageUrl ? <img src={card.imageUrl} alt="" loading="lazy" /> : <ImagePlus size={18} />}
                </span>
                <span className={styles.tcgdexResultInfo}>
                  <strong>{card.name}</strong>
                  <span className={styles.tcgdexResultMeta}>
                    <small>{card.setName || `Set ${card.setCode}`}</small>
                    <small>N.º {card.localId} · {card.setCode}</small>
                  </span>
                  <span className={[styles.tcgdexResultMeta, styles.tcgdexResultMetaMuted].filter(Boolean).join(' ')}>
                    {card.rarity && <small>{card.rarity}</small>}
                    {card.category && <small>{card.category}</small>}
                    {card.types?.length ? <small>{card.types.join(' · ')}</small> : null}
                    {card.holo && <small>Holo</small>}
                    {card.firstEdition && <small>1.ª edición</small>}
                  </span>
                </span>
                <span className={styles.tcgdexResultAction}>
                  {tcgdexLoadingId === card.id ? <LoaderCircle size={16} className={styles.spin} /> : <Check size={16} />}
                </span>
              </button>
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}
