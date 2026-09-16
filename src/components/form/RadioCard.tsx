import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './RadioCard.module.css';

export function RadioCard({ title, description, children, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { title: string; description?: string; children?: ReactNode }) {
  return (
    <label className={`${styles.radioCard} radio-card ${className}`.trim()}>
      <input type="radio" {...props} />
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
        {children}
      </span>
    </label>
  );
}

