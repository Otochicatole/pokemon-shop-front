import type { Money } from '@/shared/api/contracts';
import { formatMoney } from '@/shared/lib/format';

const labels: Record<string, string> = {
  DRAFT: 'Borrador', PUBLISHED: 'Publicado', ARCHIVED: 'Archivado',
  SINGLE_CARD: 'Carta individual', SEALED_PRODUCT: 'Producto sellado', ACCESSORY: 'Accesorio',
  UNIQUE: 'Unidad única', QUANTITY: 'Por cantidad',
  PENDING_PAYMENT: 'Pago pendiente', PAYMENT_REVIEW: 'Comprobante en revisión', PAID: 'Pagada', PREPARING: 'Preparando', READY_FOR_PICKUP: 'Lista para retirar', SHIPPED: 'Enviada', COMPLETED: 'Completada', CANCELLED: 'Cancelada', EXPIRED: 'Vencida', REFUND_RECORDED: 'Reembolso registrado', PAYMENT_REQUIRES_REVIEW: 'Pago requiere revisión',
  PENDING: 'Pendiente', UNDER_REVIEW: 'En revisión', APPROVED: 'Aprobado', REJECTED: 'Rechazado', FAILED: 'Fallido', REFUNDED: 'Reembolsado', DISPUTED: 'En disputa', REQUIRES_REVIEW: 'Requiere revisión',
  BANK_TRANSFER: 'Transferencia', MERCADO_PAGO: 'Mercado Pago', SHIPMENT: 'Envío', PICKUP: 'Retiro',
  ACTIVE: 'Activo', SUSPENDED: 'Suspendido',
  VERIFIED: 'Verificado', UNVERIFIED: 'Sin verificar',
  type: 'Tipo', zoneName: 'Zona', rateName: 'Tarifa', ratePrice: 'Precio de envío', shippingRateId: 'ID de tarifa', pickupPointId: 'ID de retiro',
  recipientName: 'Destinatario', recipientPhone: 'Teléfono', addressLine1: 'Dirección', addressLine2: 'Complemento', city: 'Ciudad', province: 'Provincia', postalCode: 'Código postal', name: 'Punto de retiro', address: 'Dirección de retiro',
};

export function adminLabel(value: string | null | undefined) {
  return value ? labels[value] ?? value.replaceAll('_', ' ').toLowerCase() : '—';
}

export function adminStatusTone(value: string): 'yellow' | 'cyan' | 'green' | 'red' | 'purple' | 'muted' {
  if (['PUBLISHED', 'PAID', 'COMPLETED', 'APPROVED', 'ACTIVE'].includes(value)) return 'green';
  if (['PENDING_PAYMENT', 'PENDING', 'DRAFT'].includes(value)) return 'yellow';
  if (['PREPARING', 'SHIPPED', 'READY_FOR_PICKUP'].includes(value)) return 'cyan';
  if (['PAYMENT_REVIEW', 'UNDER_REVIEW', 'REQUIRES_REVIEW', 'PAYMENT_REQUIRES_REVIEW'].includes(value)) return 'purple';
  if (['ARCHIVED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'FAILED', 'DISPUTED', 'SUSPENDED'].includes(value)) return 'red';
  return 'muted';
}

export function AdminBadge({ value }: { value: string }) {
  const tone = adminStatusTone(value);
  return <span className={`admin-badge admin-badge-${tone}`}>{adminLabel(value)}</span>;
}

export function adminMoney(value?: Money | null) {
  return value ? formatMoney(value) : '—';
}

export function adminDate(value?: string | Date | null, withTime = false) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-AR', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value));
}
