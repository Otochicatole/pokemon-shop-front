import type { ReactNode } from 'react';
export function MobileMenu({ open, children, className = '' }: { open: boolean; children: ReactNode; className?: string }) { return <nav className={`main-nav ${open ? 'is-open' : ''} ${className}`} aria-hidden={!open}>{children}</nav>; }
