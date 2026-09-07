import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({ title, eyebrow, children, asideContent }: { title: string; eyebrow?: string; children: ReactNode; asideContent?: ReactNode }) {
  return <main className="auth-page"><div className={`auth-aside ${asideContent ? 'auth-aside-hero' : ''}`}><Link href="/" className="brand light"><span className="brand-mark">✦</span><span>Card Shop<small>objetos para coleccionar</small></span></Link>{asideContent ?? <p>Encontrá piezas que merecen un lugar especial.</p>}</div><div className="auth-panel"><div className="auth-card"><p className="eyebrow">{eyebrow ?? 'Tu cuenta'}</p><h1>{title}</h1>{children}</div></div></main>;
}
