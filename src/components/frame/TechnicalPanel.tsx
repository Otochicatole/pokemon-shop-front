import type { HTMLAttributes } from 'react';
import styles from './TechnicalPanel.module.css';

export function TechnicalPanel({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.technicalPanel} technical-panel ${className}`.trim()} {...props}>{children}</div>;
}

