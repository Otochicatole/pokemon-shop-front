import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
export function SearchField({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) { return <label className={`search-box ${className}`}><Search size={18} aria-hidden="true" /><input type="search" {...props} /></label>; }
