'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, setCsrf } from '@/shared/api/client';
import { clearUserPrivateCache } from '../application/session-cache';
import { getMe } from '../infrastructure/api';
import { publishSessionSync } from '@/shared/auth/session-sync';

export function OAuthResult({ result }: { result?: string }) {
  const queryClient = useQueryClient();
  const synchronizedResult = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (result !== 'success' || synchronizedResult.current === result) return;
    synchronizedResult.current = result;
    let cancelled = false;
    void queryClient.cancelQueries({ queryKey: ['me'], exact: true });
    clearUserPrivateCache(queryClient);
    queryClient.setQueryData(['me'], null);
    publishSessionSync('user', 'changed');
    void apiFetch('/auth/csrf')
      .then((data) => {
        const payload = data as { data?: { csrfToken?: string | null }; csrfToken?: string | null };
        setCsrf(payload.data?.csrfToken ?? payload.csrfToken ?? null);
        return getMe();
      })
      .then((user) => { if (!cancelled) queryClient.setQueryData(['me'], user); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [queryClient, result]);
  const ok = result !== 'error';
  return <main className="auth-page"><div className="auth-panel full"><div className="auth-card"> <p className="eyebrow">Google</p><h1>{ok ? 'Acceso confirmado' : 'No pudimos conectar Google'}</h1><p>{ok ? 'Tu sesión está lista.' : 'Podés volver a intentar o ingresar con email y contraseña.'}</p><Link href={ok ? '/account' : '/auth/login'} className="button button-primary">{ok ? 'Ir a mi cuenta' : 'Volver a ingresar'}</Link></div></div></main>;
}
