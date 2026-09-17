import type { Product } from '@/shared/api/contracts';
export type CartItem = Pick<Product, 'id' | 'slug' | 'name' | 'price' | 'productVersion' | 'available' | 'images' | 'sku'> & { seller?: Product['seller']; quantity: number };
export function cartTotal(items: CartItem[]) { return items.reduce((sum, item) => sum + BigInt(item.price.amountMinor) * BigInt(item.quantity), 0n); }
/** Store-owned product subtotal — loyalty earn/redeem ignore affiliate lines. */
export function storeCartTotal(items: CartItem[]) {
  return items
    .filter((item) => item.seller?.type !== 'AFFILIATE')
    .reduce((sum, item) => sum + BigInt(item.price.amountMinor) * BigInt(item.quantity), 0n);
}
