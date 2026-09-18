'use client';

import { useSyncExternalStore } from 'react';

let flippedSlug: string | null = null;
const listeners = new Set<() => void>();
let outsideBound = false;

function emit() {
  listeners.forEach((listener) => listener());
}

export function setFlippedProductSlug(slug: string | null) {
  if (flippedSlug === slug) return;
  flippedSlug = slug;
  emit();
}

/** Si es la misma carta, la cierra; si es otra, abre solo esa. */
export function flipProductCard(slug: string) {
  flippedSlug = flippedSlug === slug ? null : slug;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return flippedSlug;
}

function getServerSnapshot() {
  return null;
}

function ensureOutsideListener() {
  if (outsideBound || typeof document === 'undefined') return;
  outsideBound = true;
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-product-flip-card]')) return;
    setFlippedProductSlug(null);
  });
}

export function useFlippedProductSlug() {
  ensureOutsideListener();
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
