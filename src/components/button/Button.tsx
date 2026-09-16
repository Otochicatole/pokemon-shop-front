import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: ReactNode;
}

export function Button({ className = '', variant = 'primary', children, ...props }: ButtonProps) {
  const variantClass = styles[variant] || '';
  return <button className={`${styles.button} ${variantClass} button button-${variant} ${className}`.trim()} {...props}>{children}</button>;
}

