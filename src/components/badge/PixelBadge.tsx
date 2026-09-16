import type { HTMLAttributes, ReactNode } from 'react';
import styles from './PixelBadge.module.css';

export type BadgeTone = 'yellow' | 'red' | 'cyan' | 'green' | 'purple';
export interface PixelBadgeProps extends HTMLAttributes<HTMLSpanElement> { tone?: BadgeTone; children: ReactNode; }

export function PixelBadge({ tone = 'yellow', children, className = '', ...props }: PixelBadgeProps) {
  const toneClass = styles[tone] || '';
  return <span className={`${styles.pixelBadge} ${toneClass} pixel-badge pixel-badge-${tone} ${className}`.trim()} {...props}>{children}</span>;
}

