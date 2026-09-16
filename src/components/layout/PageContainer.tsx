import type { HTMLAttributes } from 'react';
import styles from './PageContainer.module.css';

export function PageContainer({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) {
  return <div className={`${styles.pageContainer} page-container ${className}`.trim()} {...props}>{children}</div>;
}

