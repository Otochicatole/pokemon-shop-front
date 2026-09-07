import type { HTMLAttributes, ReactNode } from 'react';
import { PixelBadge } from './PixelBadge';
export function PurpleBadge({ children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) { return <PixelBadge tone="purple" {...props}>{children}</PixelBadge>; }
