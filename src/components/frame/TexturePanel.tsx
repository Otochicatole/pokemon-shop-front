import type { HTMLAttributes } from 'react';

export function TexturePanel({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`texture-panel ${className}`} {...props}>{children}</div>;
}
