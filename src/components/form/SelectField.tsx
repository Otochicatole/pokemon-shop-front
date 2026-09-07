import type { ReactNode, SelectHTMLAttributes } from 'react';
export function SelectField({ label, children, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode; className?: string }) { return <label className={`component-field ${className}`}><span>{label}</span><select {...props}>{children}</select></label>; }
