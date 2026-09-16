import type { ReactNode } from 'react';
import styles from './SuccessMessage.module.css';

export function SuccessMessage({ title, description, children, className = '' }: { title: string; description?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`${styles.successMessage} success-message ${className}`.trim()}>
      <span aria-hidden="true">✓</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}

