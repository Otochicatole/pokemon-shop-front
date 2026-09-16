import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
import styles from './YellowBadge.module.css';

export function YellowBadge({ className = '', children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return <PixelBadge tone="yellow" className={`${styles.yellowBadge} ${className}`.trim()} {...props}>{children}</PixelBadge>;
}

