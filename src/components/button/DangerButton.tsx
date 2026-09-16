import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';
import styles from './DangerButton.module.css';

export function DangerButton({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return <Button variant="danger" className={`${styles.dangerButton} ${className}`.trim()} {...props}>{children}</Button>;
}

