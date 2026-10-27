import type { ReactNode } from 'react';
import { LegendaryBattle } from './legendary-battle';
import styles from './auth-shell.module.css';

export function AuthShell({ title, eyebrow, children, asideContent, singleLineTitle = false }: { title: string; eyebrow?: string; children: ReactNode; asideContent?: ReactNode; singleLineTitle?: boolean }) {
  return (
    <main className={`${styles.authPage} auth-page`}>
      <div className={`${styles.authAside} ${styles.authAsideHero} auth-aside-hero auth-aside`}>
        {asideContent ?? <LegendaryBattle />}
      </div>
      <div className={`${styles.authPanel} auth-panel`}>
        <div className={`${styles.authCard} auth-card`}>
          <h1 className={singleLineTitle ? styles.singleLineTitle : undefined}>{title}</h1>
          <p className={styles.intro}>{eyebrow ?? 'Tu colección empieza acá.'}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
