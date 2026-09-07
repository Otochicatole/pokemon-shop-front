import type { HTMLAttributes } from 'react';
export function ProductTile({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) { return <article className={`product-card product-tile ${className}`} {...props}>{children}</article>; }
