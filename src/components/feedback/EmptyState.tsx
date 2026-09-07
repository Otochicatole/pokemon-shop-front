import type { ReactNode } from 'react';

export function EmptyState({ title, description, children, icon = '◈', className = '' }: { title: string; description?: string; children?: ReactNode; icon?: ReactNode; className?: string }) {
  return <div className={`empty-state ${className}`}><span className="empty-icon">{icon}</span><h2>{title}</h2>{description && <p>{description}</p>}{children}</div>;
}
