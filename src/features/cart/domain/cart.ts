import type { Product } from '@/shared/api/contracts';
export type CartItem = Pick<Product, 'id' | 'slug' | 'name' | 'price' | 'productVersion' | 'available' | 'images' | 'sku'> & { quantity: number };
export function cartTotal(items: CartItem[]) { return items.reduce((sum, item) => sum + BigInt(item.price.amountMinor) * BigInt(item.quantity), 0n); }
