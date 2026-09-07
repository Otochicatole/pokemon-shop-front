import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';

export function GhostButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return <Button variant="ghost" {...props}>{children}</Button>;
}
