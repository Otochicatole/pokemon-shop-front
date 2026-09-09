import type { TextareaHTMLAttributes } from 'react';

export function TextareaField({ label, error, hint, id, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string }) {
  const inputId = id ?? `textarea-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label className={`component-field ${className}`} htmlFor={inputId}><span>{label}</span><textarea id={inputId} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} {...props} />{error ? <small id={`${inputId}-error`} className="form-error">{error}</small> : hint && <small id={`${inputId}-hint`} className="form-hint">{hint}</small>}</label>;
}
