import type { HTMLAttributes } from 'react';
export function PageContainer({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) { return <div className={`page-container ${className}`} {...props}>{children}</div>; }
