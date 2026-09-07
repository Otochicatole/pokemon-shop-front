import type { ReactNode } from 'react';
export function FormHint({ children, className = '' }: { children: ReactNode; className?: string }) { return <p className={`form-hint ${className}`}>{children}</p>; }
