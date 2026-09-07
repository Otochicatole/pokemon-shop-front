import type { ReactNode } from 'react';

export function SuccessMessage({ title, description, children, className = '' }: { title: string; description?: string; children?: ReactNode; className?: string }) {
  return <div className={`success-message ${className}`}><span aria-hidden="true">✓</span><h2>{title}</h2>{description && <p>{description}</p>}{children}</div>;
}
