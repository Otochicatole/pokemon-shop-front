import type { ReactNode } from 'react';
import styles from './FormHint.module.css';

export function FormHint({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`${styles.formHint} form-hint ${className}`.trim()}>{children}</p>;
}

