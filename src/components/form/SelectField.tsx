import type { ReactNode, SelectHTMLAttributes } from 'react';
import styles from './SelectField.module.css';

export function SelectField({ label, children, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`${styles.componentField} component-field ${className}`.trim()}>
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

