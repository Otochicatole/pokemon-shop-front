import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
import styles from './RedBadge.module.css';

export function RedBadge({ className = '', children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return <PixelBadge tone="red" className={`${styles.redBadge} ${className}`.trim()} {...props}>{children}</PixelBadge>;
}

