import type { HTMLAttributes } from 'react';
export function Stack({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`component-stack ${className}`} {...props}>{children}</div>; }
