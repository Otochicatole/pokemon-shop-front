import type { HTMLAttributes } from 'react';

export function Eyebrow({ className = '', children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`eyebrow ${className}`} {...props}>{children}</p>;
}
