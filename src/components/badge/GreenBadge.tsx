import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
export function GreenBadge({ children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) { return <PixelBadge tone="green" {...props}>{children}</PixelBadge>; }
