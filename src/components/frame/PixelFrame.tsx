import type { HTMLAttributes } from 'react';
import styles from './PixelFrame.module.css';

export function PixelFrame({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.pixelFrame} pixel-frame ${className}`.trim()} {...props}>{children}</div>;
}

