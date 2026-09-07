import type { InputHTMLAttributes } from 'react';
export function FileUploadField({ label, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className={`upload-box ${className}`}><span>{label}</span><input type="file" {...props} /></label>; }
