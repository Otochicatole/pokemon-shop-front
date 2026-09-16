import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';
import styles from './GhostButton.module.css';

export function GhostButton({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return <Button variant="ghost" className={`${styles.ghostButton} ${className}`.trim()} {...props}>{children}</Button>;
}

