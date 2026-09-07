import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
export function CyanBadge({ children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) { return <PixelBadge tone="cyan" {...props}>{children}</PixelBadge>; }
