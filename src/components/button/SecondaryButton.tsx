import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';
import styles from './SecondaryButton.module.css';

export function SecondaryButton({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return <Button variant="secondary" className={`${styles.secondaryButton} ${className}`.trim()} {...props}>{children}</Button>;
}

