import { apiFetch } from '@/shared/api/client';
import { optionsSchema, orderSchema, type OrderInput } from '@/shared/api/contracts';
export async function getCheckoutOptions() { return apiFetch('/checkout/options', {}, optionsSchema); }
export async function previewCheckout(input: OrderInput) { return apiFetch('/checkout/preview', { method: 'POST', body: JSON.stringify(input) }) as Promise<{ subtotal: { amountMinor: string; currency: 'ARS' }; shipping: { amountMinor: string; currency: 'ARS' }; total: { amountMinor: string; currency: 'ARS' }; expiresAt: string }>; }
export async function createOrder(input: OrderInput, idempotencyKey: string) { const data = await apiFetch('/orders', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) }) as { order: unknown; reused: boolean }; return { order: orderSchema.parse(data.order), reused: data.reused }; }
export async function uploadReceipt(number: string, file: File) { const form = new FormData(); form.append('receipt', file); return apiFetch(`/orders/${encodeURIComponent(number)}/transfer-receipt`, { method: 'POST', body: form }); }
