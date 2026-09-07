import type { HTMLAttributes } from 'react';

export function TechnicalPanel({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`technical-panel ${className}`} {...props}>{children}</div>;
}
