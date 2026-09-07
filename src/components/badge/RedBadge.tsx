import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
export function RedBadge({ children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) { return <PixelBadge tone="red" {...props}>{children}</PixelBadge>; }
