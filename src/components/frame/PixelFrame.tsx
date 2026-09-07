import type { HTMLAttributes } from 'react';

export function PixelFrame({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`pixel-frame ${className}`} {...props}>{children}</div>;
}
