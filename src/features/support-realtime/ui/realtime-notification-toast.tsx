'use client';

import { ArrowRight, Banknote, Bell, CircleAlert, Headphones, PackageCheck, Store } from 'lucide-react';
import styles from './support-realtime-provider.module.css';

type Category = 'support' | 'order' | 'payment' | 'affiliate';
type ToastVariant = 'store' | 'admin';

const categoryLabels: Record<Category, string> = {
  support: 'Soporte',
  order: 'Orden',
  payment: 'Pago',
  affiliate: 'Afiliado',
};

function resolveCategory(type: string | undefined): Category {
  if (!type) return 'order';
  if (type === 'SUPPORT_MESSAGE') return 'support';
  if (type === 'PAYMENT_REQUIRES_REVIEW' || type === 'TRANSFER_RECEIPT_SUBMITTED' || type === 'PAYMENT_APPROVED') return 'payment';
  if (type.startsWith('AFFILIATE_')) return 'affiliate';
  return 'order';
}

function categoryIcon(category: Category, type: string | undefined) {
  if (category === 'support') return <Headphones size={16} aria-hidden="true" />;
  if (type === 'PAYMENT_REQUIRES_REVIEW' || type === 'TRANSFER_RECEIPT_SUBMITTED') {
    return <CircleAlert size={16} aria-hidden="true" />;
  }
  if (category === 'payment') return <Banknote size={16} aria-hidden="true" />;
  if (category === 'affiliate') {
    if (type?.includes('PAYOUT')) return <Banknote size={16} aria-hidden="true" />;
    return <Store size={16} aria-hidden="true" />;
  }
  return <PackageCheck size={16} aria-hidden="true" />;
}

const iconClass: Record<Category, string> = {
  support: styles.toastIconSupport,
  order: styles.toastIconOrder,
  payment: styles.toastIconPayment,
  affiliate: styles.toastIconAffiliate,
};

const badgeClass: Record<Category, string> = {
  support: styles.toastBadgeSupport,
  order: styles.toastBadgeOrder,
  payment: styles.toastBadgePayment,
  affiliate: styles.toastBadgeAffiliate,
};

export function RealtimeNotificationToast({
  title,
  message,
  type,
  variant = 'store',
  onOpen,
}: {
  title: string;
  message: string;
  type?: string;
  variant?: ToastVariant;
  onOpen: () => void;
}) {
  const category = resolveCategory(type);
  const isAdmin = variant === 'admin';

  return (
    <button
      type="button"
      className={`${styles.realtimeNotificationToast} ${isAdmin ? styles.realtimeNotificationToastAdmin : ''} realtime-notification-toast`}
      aria-label={`Abrir notificación: ${title}`}
      onClick={onOpen}
    >
      <span className={styles.toastTop}>
        <span className={`${styles.toastIcon} ${iconClass[category]}`}>
          {categoryIcon(category, type)}
        </span>
        <span className={`${styles.toastBadge} ${badgeClass[category]}`}>
          {categoryLabels[category]}
        </span>
        {isAdmin && <span className={styles.toastScope}>CMS</span>}
        <span className={styles.toastNew} aria-hidden="true">
          {isAdmin ? 'Pendiente' : 'Nuevo'}
        </span>
      </span>
      <strong className={styles.toastTitle}>{title}</strong>
      <span className={styles.toastMessage}>{message}</span>
      <span className={styles.toastFooter}>
        <span className={styles.toastHint}>
          <Bell size={12} aria-hidden="true" />
          {isAdmin ? 'Acción requerida' : 'Tocá para abrir'}
        </span>
        <span className={styles.toastOpen}>
          {isAdmin ? 'Revisar' : 'Abrir'}
          <ArrowRight size={12} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
