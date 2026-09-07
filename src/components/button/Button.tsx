import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: ReactNode;
}

export function Button({ className = '', variant = 'primary', children, ...props }: ButtonProps) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
