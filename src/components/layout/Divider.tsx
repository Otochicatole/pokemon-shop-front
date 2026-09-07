import type { HTMLAttributes } from 'react';
export function Divider({ className = '', ...props }: HTMLAttributes<HTMLHRElement>) { return <hr className={`component-divider ${className}`} {...props} />; }
