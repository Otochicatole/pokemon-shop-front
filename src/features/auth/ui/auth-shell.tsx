import type { ReactNode } from 'react';
import styles from './auth-shell.module.css';

export function AuthShell({ title, eyebrow, children, asideContent }: { title: string; eyebrow?: string; children: ReactNode; asideContent?: ReactNode }) {
  return (
    <main className={`${styles.authPage} auth-page`}>
      <div className={`${styles.authAside} ${asideContent ? `${styles.authAsideHero} auth-aside-hero` : ''} auth-aside`}>
        {asideContent ?? <p>Encontrá piezas que merecen un lugar especial.</p>}
      </div>
      <div className={`${styles.authPanel} auth-panel`}>
        <div className={`${styles.authCard} auth-card`}>
          <p className="eyebrow">{eyebrow ?? 'Tu cuenta'}</p>
          <h1>{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
