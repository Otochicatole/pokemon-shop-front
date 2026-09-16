import type { HTMLAttributes } from 'react';
import styles from './Divider.module.css';

export function Divider({ className = '', ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={`${styles.divider} component-divider ${className}`.trim()} {...props} />;
}

