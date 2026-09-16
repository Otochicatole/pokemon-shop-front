'use client';

import { Check, CircleAlert, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast as sonnerToast, type ExternalToast } from 'sonner';
import styles from './app-toast.module.css';

export type AppToastTone = 'success' | 'error' | 'warning' | 'info';

const toneMeta: Record<AppToastTone, { label: string; icon: ReactNode }> = {
  success: { label: 'Listo', icon: <Check size={16} aria-hidden="true" /> },
  error: { label: 'Error', icon: <CircleAlert size={16} aria-hidden="true" /> },
  warning: { label: 'Atención', icon: <CircleAlert size={16} aria-hidden="true" /> },
  info: { label: 'Info', icon: <Info size={16} aria-hidden="true" /> },
};

function toNode(value: (() => ReactNode) | ReactNode) {
  return typeof value === 'function' ? value() : value;
}

export function AppToast({
  tone,
  title,
  description,
  onDismiss,
}: {
  tone: AppToastTone;
  title: ReactNode;
  description?: ReactNode;
  onDismiss?: () => void;
}) {
  const meta = toneMeta[tone];

  return (
    <div className={`${styles.toast} ${styles[tone]}`} role="status" aria-live="polite">
      <div className={styles.top}>
        <span className={styles.icon}>{meta.icon}</span>
        <span className={styles.badge}>{meta.label}</span>
        {onDismiss && (
          <button type="button" className={styles.close} aria-label="Cerrar aviso" onClick={onDismiss}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <strong className={styles.title}>{title}</strong>
      {description ? <span className={styles.description}>{description}</span> : null}
    </div>
  );
}

type ToastMessage = (() => ReactNode) | ReactNode;

function show(tone: AppToastTone, message: ToastMessage, data?: ExternalToast) {
  const title = toNode(message);
  const description = data?.description !== undefined ? toNode(data.description) : undefined;

  return sonnerToast.custom(
    (id) => (
      <AppToast
        tone={tone}
        title={title}
        description={description}
        onDismiss={() => sonnerToast.dismiss(id)}
      />
    ),
    {
      ...data,
      description: undefined,
      unstyled: true,
      duration: data?.duration ?? 4500,
    },
  );
}

export const toast = Object.assign(
  (message: ToastMessage, data?: ExternalToast) => show('info', message, data),
  {
    success: (message: ToastMessage, data?: ExternalToast) => show('success', message, data),
    error: (message: ToastMessage, data?: ExternalToast) => show('error', message, data),
    warning: (message: ToastMessage, data?: ExternalToast) => show('warning', message, data),
    info: (message: ToastMessage, data?: ExternalToast) => show('info', message, data),
    message: (message: ToastMessage, data?: ExternalToast) => show('info', message, data),
    custom: sonnerToast.custom,
    dismiss: sonnerToast.dismiss,
    loading: sonnerToast.loading,
    promise: sonnerToast.promise,
  },
);
