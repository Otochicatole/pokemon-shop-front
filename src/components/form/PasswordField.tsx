import type { InputHTMLAttributes } from 'react';
import { TextField } from './TextField';
import styles from './PasswordField.module.css';

export function PasswordField({ className = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; hint?: string; error?: string }) {
  return <TextField type="password" autoComplete="new-password" className={`${styles.passwordField} ${className}`.trim()} {...props} />;
}

