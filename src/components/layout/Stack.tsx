import type { HTMLAttributes } from 'react';
import styles from './Stack.module.css';

export function Stack({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.stack} component-stack ${className}`.trim()} {...props}>{children}</div>;
}

