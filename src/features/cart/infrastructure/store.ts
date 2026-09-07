'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/shared/api/contracts';
import type { CartItem } from '../domain/cart';

type CartState = { items: CartItem[]; add: (product: Product, quantity?: number) => void; setQuantity: (id: string, quantity: number) => void; remove: (id: string) => void; clear: () => void; replaceProduct: (product: Product) => void };
export const useCartStore = create<CartState>()(persist((set) => ({
  items: [],
  add: (product, quantity = 1) => set((state) => { const current = state.items.find((item) => item.id === product.id); const next = Math.min(product.available, (current?.quantity ?? 0) + quantity); const item: CartItem = { id: product.id, slug: product.slug, name: product.name, price: product.price, productVersion: product.productVersion, available: product.available, images: product.images, sku: product.sku, quantity: next }; return { items: current ? state.items.map((entry) => entry.id === product.id ? item : entry) : [...state.items, item] }; }),
  setQuantity: (id, quantity) => set((state) => ({ items: quantity <= 0 ? state.items.filter((item) => item.id !== id) : state.items.map((item) => item.id === id ? { ...item, quantity: Math.min(item.available, quantity) } : item) })),
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clear: () => set({ items: [] }),
  replaceProduct: (product) => set((state) => ({ items: state.items.map((item) => item.id === product.id ? { ...item, name: product.name, slug: product.slug, price: product.price, productVersion: product.productVersion, available: product.available, images: product.images, sku: product.sku, quantity: Math.min(item.quantity, product.available) } : item).filter((item) => item.quantity > 0) })),
}), { name: 'card-shop-cart', storage: createJSONStorage(() => localStorage) }));
