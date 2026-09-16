import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';
import styles from './PrimaryButton.module.css';

export function PrimaryButton({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return <Button variant="primary" className={`${styles.primaryButton} ${className}`.trim()} {...props}>{children}</Button>;
}

