import type { ReactNode, SelectHTMLAttributes } from 'react';
import styles from './SelectField.module.css';

export function SelectField({
  label,
  children,
  className = '',
  error,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
  className?: string;
  error?: string;
}) {
  const selectId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <label className={`${styles.componentField} component-field ${className}`.trim()} htmlFor={selectId}>
      <span>{label}</span>
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {error && <small id={`${selectId}-error`} className={`${styles.formError} form-error`}>{error}</small>}
    </label>
  );
}
