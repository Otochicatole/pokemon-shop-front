import type { HTMLAttributes, ReactNode } from 'react';

export function Notice({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`notice ${className}`} {...props}>{children}</div>;
}
