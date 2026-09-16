import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
import styles from './PurpleBadge.module.css';

export function PurpleBadge({ className = '', children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return <PixelBadge tone="purple" className={`${styles.purpleBadge} ${className}`.trim()} {...props}>{children}</PixelBadge>;
}

