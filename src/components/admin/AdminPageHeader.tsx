import type { ReactNode } from 'react';
import styles from './AdminPageHeader.module.css';

export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className={styles.adminPageHeader}>
      <div>
        {eyebrow && <span className={styles.adminEyebrow}>{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className={styles.adminPageActions}>{actions}</div>}
    </header>
  );
}
