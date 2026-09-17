import type { ReactNode } from 'react';
import styles from './AdminStatCard.module.css';

const toneClass = {
  yellow: styles.toneYellow,
  cyan: styles.toneCyan,
  green: styles.toneGreen,
  red: styles.toneRed,
  purple: styles.tonePurple,
} as const;

export function AdminStatCard({ label, value, detail, icon, tone = 'yellow' }: { label: string; value: ReactNode; detail?: string; icon?: ReactNode; tone?: 'yellow' | 'cyan' | 'green' | 'red' | 'purple' }) {
  return (
    <article className={`${styles.adminStatCard} ${toneClass[tone]}`}>
      <div className={styles.adminStatLabel}>{icon}<span>{label}</span></div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
