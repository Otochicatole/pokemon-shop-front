import type { ReactNode } from 'react';

export function AdminStatCard({ label, value, detail, icon, tone = 'yellow' }: { label: string; value: ReactNode; detail?: string; icon?: ReactNode; tone?: 'yellow' | 'cyan' | 'green' | 'red' | 'purple' }) {
  return <article className={`admin-stat-card admin-tone-${tone}`}><div className="admin-stat-label">{icon}<span>{label}</span></div><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}
