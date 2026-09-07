export function FormError({ children, className = '' }: { children: string; className?: string }) { return <p className={`form-error ${className}`} role="alert">{children}</p>; }
