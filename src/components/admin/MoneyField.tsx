'use client';

import { useId, type InputHTMLAttributes } from 'react';

export function MoneyField({ label, error, id, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; error?: string }) {
  const generatedId = useId();
  const inputId = id ?? `money-${generatedId}`;
  const errorId = `${inputId}-error`;
  return <label className="component-field admin-money-field" htmlFor={inputId}><span>{label}</span><span className="admin-money-input"><b>ARS</b><input id={inputId} type="number" min="0" step="0.01" inputMode="decimal" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} {...props} /></span>{error && <small id={errorId} className="form-error">{error}</small>}</label>;
}
