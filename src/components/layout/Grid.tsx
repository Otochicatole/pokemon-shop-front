import type { HTMLAttributes } from 'react';
export function Grid({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`component-grid ${className}`} {...props}>{children}</div>; }
