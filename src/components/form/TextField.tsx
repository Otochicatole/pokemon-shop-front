import type { InputHTMLAttributes, ReactNode } from 'react';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> { label: string; hint?: ReactNode; error?: string; }
export function TextField({ label, hint, error, id, className = '', ...props }: TextFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label className={`component-field ${className}`} htmlFor={inputId}><span>{label}</span><input id={inputId} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} {...props} />{error && <small id={`${inputId}-error`} className="form-error">{error}</small>}{hint && !error && <small id={`${inputId}-hint`} className="form-hint">{hint}</small>}</label>;
}
