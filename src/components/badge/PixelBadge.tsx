import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'yellow' | 'red' | 'cyan' | 'green' | 'purple';
export interface PixelBadgeProps extends HTMLAttributes<HTMLSpanElement> { tone?: BadgeTone; children: ReactNode; }

export function PixelBadge({ tone = 'yellow', children, className = '', ...props }: PixelBadgeProps) {
  return <span className={`pixel-badge pixel-badge-${tone} ${className}`} {...props}>{children}</span>;
}
