import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
export function YellowBadge({ children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) { return <PixelBadge tone="yellow" {...props}>{children}</PixelBadge>; }
