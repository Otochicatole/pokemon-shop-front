import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';

export function SecondaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return <Button variant="secondary" {...props}>{children}</Button>;
}
