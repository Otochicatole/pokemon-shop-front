'use client';

import { Dialog } from '@/components/overlay';
import { DangerButton, SecondaryButton } from '@/components/button';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', busy = false, danger = true, onConfirm, onClose, children }: { open: boolean; title: string; description: string; confirmLabel?: string; busy?: boolean; danger?: boolean; onConfirm: () => void | Promise<void>; onClose: () => void; children?: React.ReactNode }) {
  const ConfirmButton = danger ? DangerButton : SecondaryButton;
  return (
    <Dialog open={open} title={title} description={description} onClose={busy ? () => undefined : onClose} className={`${styles.adminConfirmDialog} admin-confirm-dialog`.trim()}>
      {children}
      <div className={`${styles.adminDialogActions} admin-dialog-actions`}>
        <SecondaryButton type="button" onClick={onClose} disabled={busy}>Volver</SecondaryButton>
        <ConfirmButton type="button" onClick={() => void onConfirm()} disabled={busy}>{busy ? 'Procesando…' : confirmLabel}</ConfirmButton>
      </div>
    </Dialog>
  );
}

