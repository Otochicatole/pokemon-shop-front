import type { ReactNode } from 'react';
import styles from './MobileMenu.module.css';

export function MobileMenu({ open, children, className = '' }: { open: boolean; children: ReactNode; className?: string }) {
  return <nav className={`${styles.mainNav} ${open ? styles.isOpen : ''} main-nav ${open ? 'is-open' : ''} ${className}`.trim()} aria-hidden={!open}>{children}</nav>;
}

