'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, setCsrf } from '@/shared/api/client';
import { clearUserPrivateCache } from '../application/session-cache';
import { getMe } from '../infrastructure/api';
import { publishSessionSync } from '@/shared/auth/session-sync';
import styles from './oauth-result.module.css';

export function OAuthResult({ result }: { result?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncState, setSyncState] = useState<'syncing' | 'failed' | 'idle'>(result === 'success' ? 'syncing' : 'idle');
  useEffect(() => {
    if (result !== 'success') return;
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
      .then((user) => {
        if (cancelled) return;
        queryClient.setQueryData(['me'], user);
        router.replace('/account');
        router.refresh();
      })
      .catch(() => { if (!cancelled) setSyncState('failed'); });
    return () => { cancelled = true; };
  }, [queryClient, result, router]);

  const ok = result === 'success';
  const linkRequired = result === 'link-required';
  const action = ok && syncState === 'syncing'
    ? <button className="button button-primary" type="button" disabled>Confirmando sesión…</button>
    : <Link href={ok ? '/account' : '/auth/login'} className="button button-primary">{ok ? 'Ir a mi cuenta' : 'Volver a ingresar'}</Link>;

  return (
    <main className={`${styles.authPage} auth-page`}>
      <div className={`${styles.authPanel} ${styles.full} auth-panel full`}>
        <div className={`${styles.authCard} auth-card`}>
          <p className="eyebrow">Google</p>
          <h1>{ok ? 'Acceso confirmado' : linkRequired ? 'Cuenta ya registrada' : 'No pudimos conectar Google'}</h1>
          <p>
            {ok
              ? syncState === 'failed'
                ? 'No pudimos confirmar la sesión. Volvé a intentar.'
                : 'Estamos sincronizando tu sesión…'
              : linkRequired
              ? 'Ese correo ya tiene una cuenta local. Iniciá sesión con email y contraseña y luego elegí “Vincular Google” desde Mi cuenta.'
              : 'Podés volver a intentar o ingresar con email y contraseña.'}
          </p>
          {action}
        </div>
      </div>
    </main>
  );
}
