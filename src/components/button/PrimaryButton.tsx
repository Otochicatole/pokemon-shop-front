import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';

export function PrimaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return <Button variant="primary" {...props}>{children}</Button>;
}
