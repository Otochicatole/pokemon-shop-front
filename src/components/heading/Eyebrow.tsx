import type { HTMLAttributes } from 'react';
import styles from './Eyebrow.module.css';

export function Eyebrow({ className = '', children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`${styles.eyebrow} eyebrow ${className}`.trim()} {...props}>{children}</p>;
}

