import type { ReactNode } from 'react';
import styles from './AdminStatCard.module.css';

export function AdminStatCard({ label, value, detail, icon, tone = 'yellow' }: { label: string; value: ReactNode; detail?: string; icon?: ReactNode; tone?: 'yellow' | 'cyan' | 'green' | 'red' | 'purple' }) {
  return (
    <article className={`${styles.adminStatCard} admin-stat-card admin-tone-${tone}`}>
      <div className={`${styles.adminStatLabel} admin-stat-label`}>{icon}<span>{label}</span></div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

