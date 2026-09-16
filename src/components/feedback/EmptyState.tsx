import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export function EmptyState({ title, description, children, icon = '◈', className = '' }: { title: string; description?: string; children?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={`${styles.emptyState} empty-state ${className}`.trim()}>
      <span className={`${styles.emptyIcon} empty-icon`}>{icon}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}

