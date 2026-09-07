import type { HTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export function PixelFrame({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`pixel-frame ${className}`} {...props}>{children}</div>;
}

export function TexturePanel({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`texture-panel ${className}`} {...props}>{children}</div>;
}

export function PixelButton({ className = '', variant = 'primary', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; children?: ReactNode }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function PixelBadge({ tone = 'yellow', children, className = '' }: { tone?: 'yellow' | 'red' | 'cyan' | 'green' | 'purple'; children: ReactNode; className?: string }) {
  return <span className={`pixel-badge pixel-badge-${tone} ${className}`}>{children}</span>;
}

export function SectionHeading({ eyebrow, title, description, action, level = 'h2' }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; level?: 'h1' | 'h2' }) {
  const Heading = level;
  return <div className="section-heading heading-row"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<Heading>{title}</Heading>{description && <p>{description}</p>}</div>{action}</div>;
}

export function PromoBar() {
  return <div className="promo-bar" aria-label="Promociones"><span>✦ Envío gratis desde $60</span><span>✦ Stock real · compra protegida</span><span>▣ Nueva expansión: ruta celeste</span></div>;
}

export function ProductTile({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <article className={`product-card product-tile ${className}`}>{children}</article>;
}

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">◈</span><h2>{title}</h2>{description && <p>{description}</p>}{children}</div>;
}

export function LoadingSkeleton({ count = 8 }: { count?: number }) {
  return <div className="product-grid" aria-label="Cargando productos">{Array.from({ length: count }, (_, i) => <div className="skeleton-card" key={i} />)}</div>;
}
