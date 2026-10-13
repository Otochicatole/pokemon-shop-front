'use client';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';

import styles from './Dialog.module.css';

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function dialogFocusables(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    if (element.matches(':disabled') || (element.hasAttribute('tabindex') && element.tabIndex < 0)) return false;
    const visibility = window.getComputedStyle(element).visibility;
    if (visibility === 'hidden' || visibility === 'collapse') return false;
    for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor.hidden || ancestor.hasAttribute('inert') || ancestor.getAttribute('aria-hidden') === 'true' || window.getComputedStyle(ancestor).display === 'none') return false;
      // A closed disclosure keeps only its first direct summary in the tab order.
      if (ancestor !== element && ancestor.tagName === 'DETAILS' && !ancestor.hasAttribute('open')) {
        const summary = Array.from(ancestor.children).find((child) => child.tagName === 'SUMMARY');
        if (!summary?.contains(element)) return false;
      }
      if (ancestor === dialog) break;
    }
    return true;
  });
}

export function Dialog({ open, title, onClose, children, className = '', description }: { open: boolean; title: string; onClose: () => void; children: ReactNode; className?: string; description?: string }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Lock the viewport: locking body makes it a new scroll container and
    // displaces sticky sidebars when the document is already scrolled.
    const scrollRoot = document.documentElement;
    const previousOverflow = scrollRoot.style.overflow;
    const previousGutter = scrollRoot.style.scrollbarGutter;
    if (window.innerWidth > scrollRoot.clientWidth) scrollRoot.style.scrollbarGutter = 'stable';
    scrollRoot.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      const focusable = dialogRef.current ? dialogFocusables(dialogRef.current) : [];
      const first = focusable.find((element) => element.hasAttribute('data-dialog-autofocus')) ?? focusable[0];
      (first ?? dialogRef.current)?.focus({ preventScroll: true });
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogFocusables(dialogRef.current);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      scrollRoot.style.overflow = previousOverflow;
      scrollRoot.style.scrollbarGutter = previousGutter;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className={`${styles.backdrop} dialog-backdrop`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} className={`${styles.dialog} dialog ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
        <button type="button" className={`${styles.close} dialog-close`} onClick={onClose} aria-label="Cerrar">×</button>
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId}>{description}</p>}
        {children}
      </section>
    </div>
  );
}

