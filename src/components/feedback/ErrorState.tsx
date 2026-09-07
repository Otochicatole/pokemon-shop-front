import type { ReactNode } from 'react';

export function ErrorState({ title = 'Algo salió mal', description, children, className = '' }: { title?: string; description?: string; children?: ReactNode; className?: string }) {
  return <div className={`empty-state error-state ${className}`} role="alert"><span className="empty-icon">!</span><h2>{title}</h2>{description && <p>{description}</p>}{children}</div>;
}
