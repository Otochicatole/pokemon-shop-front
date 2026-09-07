'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { apiFetch, setCsrf } from '@/shared/api/client';
export function OAuthResult({ result }: { result?: string }) { useEffect(() => { if (result === 'success') void apiFetch('/auth/csrf').then((data) => setCsrf((data as { csrfToken?: string }).csrfToken ?? null)); }, [result]); const ok = result !== 'error'; return <main className="auth-page"><div className="auth-panel full"><div className="auth-card"> <p className="eyebrow">Google</p><h1>{ok ? 'Acceso confirmado' : 'No pudimos conectar Google'}</h1><p>{ok ? 'Tu sesión está lista.' : 'Podés volver a intentar o ingresar con email y contraseña.'}</p><Link href={ok ? '/account' : '/auth/login'} className="button button-primary">{ok ? 'Ir a mi cuenta' : 'Volver a ingresar'}</Link></div></div></main>; }
