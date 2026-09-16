import type { HTMLAttributes } from 'react';
import styles from './Grid.module.css';

export function Grid({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.grid} component-grid ${className}`.trim()} {...props}>{children}</div>;
}

