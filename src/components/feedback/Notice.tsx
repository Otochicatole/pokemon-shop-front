import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Notice.module.css';

export function Notice({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`${styles.notice} notice ${className}`.trim()} {...props}>{children}</div>;
}

