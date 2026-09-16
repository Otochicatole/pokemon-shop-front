import type { ReactNode } from 'react';
import styles from './ErrorState.module.css';

export function ErrorState({ title = 'Algo salió mal', description, children, className = '' }: { title?: string; description?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`${styles.errorState} empty-state error-state ${className}`.trim()} role="alert">
      <span className={`${styles.errorIcon} empty-icon`}>!</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}

