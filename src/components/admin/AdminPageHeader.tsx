import type { ReactNode } from 'react';
import styles from './AdminPageHeader.module.css';

export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className={`${styles.adminPageHeader} admin-page-header`}>
      <div>
        {eyebrow && <span className={`${styles.adminEyebrow} admin-eyebrow`}>{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className={`${styles.adminPageActions} admin-page-actions`}>{actions}</div>}
    </header>
  );
}

