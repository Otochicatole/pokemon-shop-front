import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';

export function DangerButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return <Button variant="danger" {...props}>{children}</Button>;
}
