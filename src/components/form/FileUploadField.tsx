import type { InputHTMLAttributes } from 'react';
import styles from './FileUploadField.module.css';

export function FileUploadField({ label, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`${styles.uploadBox} upload-box ${className}`.trim()}>
      <span>{label}</span>
      <input type="file" {...props} />
    </label>
  );
}

