import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
import styles from './CyanBadge.module.css';

export function CyanBadge({ className = '', children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return <PixelBadge tone="cyan" className={`${styles.cyanBadge} ${className}`.trim()} {...props}>{children}</PixelBadge>;
}

