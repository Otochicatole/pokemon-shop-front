'use client';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Product } from '@/shared/api/contracts';
import { Button } from '@/components/button';
import { useCartStore } from '../infrastructure/store';
export function AddToCartButton({ product, compact = false }: { product: Product; compact?: boolean }) { const add = useCartStore((s) => s.add); const [added, setAdded] = useState(false); const disabled = product.available < 1; return <Button type="button" disabled={disabled} className={compact ? 'add-compact' : ''} onClick={() => { add(product); setAdded(true); toast.success('Agregado al carrito'); setTimeout(() => setAdded(false), 1300); }}>{added ? <Check size={17} /> : <Plus size={17} />}{compact ? null : disabled ? 'Sin stock' : 'Agregar al carrito'}</Button>; }
