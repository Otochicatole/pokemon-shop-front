import type { Money } from '@/shared/api/contracts';

export function formatMoney(money: Money | undefined) {
  if (!money) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: money.currency, minimumFractionDigits: 2 }).format(Number(BigInt(money.amountMinor)) / 100);
}

export function formatDate(value: string | Date) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(value)); }
export function statusLabel(status: string) { return ({ PENDING_PAYMENT: 'Pendiente de pago', PAYMENT_REVIEW: 'En revisión', PAID: 'Pagada', PREPARING: 'Preparando', READY_FOR_PICKUP: 'Lista para retirar', SHIPPED: 'Enviada', COMPLETED: 'Completada', CANCELLED: 'Cancelada', EXPIRED: 'Expirada', PAYMENT_REQUIRES_REVIEW: 'Requiere revisión' } as Record<string, string>)[status] ?? status; }
