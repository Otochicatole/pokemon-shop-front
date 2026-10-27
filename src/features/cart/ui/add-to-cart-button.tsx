'use client';
import { Check, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/feedback';
import type { Product } from '@/shared/api/contracts';
import { Button } from '@/components/button';
import { useCartStore } from '../infrastructure/store';
import styles from './add-to-cart-button.module.css';

export function AddToCartButton({ product, compact = false }: { product: Product; compact?: boolean }) {
  const add = useCartStore((s) => s.add);
  const [added, setAdded] = useState(false);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabled = product.available < 1;
  const label = disabled ? 'Sin stock' : added ? 'Agregado al carrito' : 'Agregar al carrito';

  useEffect(() => () => {
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
  }, []);

  return (
    <Button
      type="button"
      disabled={disabled}
      aria-label={compact ? `${label}: ${product.name}` : undefined}
      title={compact ? label : undefined}
      aria-live="polite"
      className={compact ? `${styles.addCompact} add-compact` : ''}
      onClick={() => {
        add(product);
        setAdded(true);
        toast.success('Agregado al carrito');
        if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
        feedbackTimeout.current = setTimeout(() => setAdded(false), 1300);
      }}
    >
      {added ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
      {compact ? null : label}
    </Button>
  );
}
