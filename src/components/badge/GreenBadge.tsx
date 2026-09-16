import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
import styles from './GreenBadge.module.css';

export function GreenBadge({ className = '', children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return <PixelBadge tone="green" className={`${styles.greenBadge} ${className}`.trim()} {...props}>{children}</PixelBadge>;
}

