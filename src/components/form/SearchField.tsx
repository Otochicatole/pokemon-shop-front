import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import styles from './SearchField.module.css';

export function SearchField({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`${styles.searchBox} search-box ${className}`.trim()}>
      <Search size={18} aria-hidden="true" />
      <input type="search" {...props} />
    </label>
  );
}

