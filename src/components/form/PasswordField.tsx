import type { InputHTMLAttributes } from 'react';
import { TextField } from './TextField';
export function PasswordField(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; hint?: string; error?: string }) { return <TextField type="password" autoComplete="new-password" {...props} />; }
