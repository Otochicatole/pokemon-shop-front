'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Coins,
  Compass,
  Headphones,
  LogOut,
  Package,
  UserRound,
} from 'lucide-react';
import { toast } from '@/components/feedback';
import { Button } from '@/components/button';
import { EmptyState, Notice } from '@/components/feedback';
import { SectionHeading } from '@/components/heading';
import { getMe, logout } from '@/features/auth/infrastructure/api';
import { getLoyaltyAccount } from '@/features/loyalty';
import { clearUserSessionCache } from '@/features/auth/application/session-cache';
import { publishSessionSync } from '@/shared/auth/session-sync';
import { googleAuthUrl } from '@/shared/config/env';
import styles from './account-home.module.css';

const tiles = [
  {
    href: '/account/points',
    title: 'Mis puntos',
    description: 'Revisá tu saldo, la regla vigente y cada movimiento.',
    icon: Coins,
    tone: 'points' as const,
    dynamic: true,
  },
  {
    href: '/account/orders',
    title: 'Mis órdenes',
    description: 'Consultá estados, pagos y comprobantes.',
    icon: Package,
    tone: 'orders' as const,
  },
  {
    href: '/account/notifications',
    title: 'Notificaciones',
    description: 'Novedades de tus órdenes y soporte.',
    icon: Bell,
    tone: 'alerts' as const,
  },
  {
    href: '/account/support',
    title: 'Soporte',
    description: 'Abrí una consulta y conversá con el equipo.',
    icon: Headphones,
    tone: 'support' as const,
  },
  {
    href: '/account/profile',
    title: 'Mi perfil',
    description: 'Cambiá tu nombre y contraseña.',
    icon: UserRound,
    tone: 'profile' as const,
  },
  {
    href: '/catalog',
    title: 'Seguir explorando',
    description: 'Encontrá tu próxima pieza en el catálogo.',
    icon: Compass,
    tone: 'catalog' as const,
  },
] as const;

export function AccountHome() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const loyalty = useQuery({
    queryKey: ['loyalty-account', 'summary'],
    queryFn: () => getLoyaltyAccount(),
    enabled: Boolean(query.data),
    retry: false,
  });

  const handleLogout = async () => {
    try {
      await logout();
      clearUserSessionCache(queryClient);
      publishSessionSync('user', 'ended');
      router.replace('/');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión');
    }
  };

  if (query.isLoading) return <div className="page-loading">Cargando cuenta…</div>;
  if (!query.data) {
    return (
      <EmptyState
        title="Tu cuenta"
        description="Ingresá para ver tus órdenes y gestionar tu acceso."
        icon={<UserRound size={36} aria-hidden="true" />}
      >
        <Link href="/auth/login?returnTo=/account" className="button button-primary">
          Ingresar
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className={styles.accountHome}>
      <SectionHeading
        level="h1"
        eyebrow="Cuenta personal"
        title={`Hola, ${query.data.name ?? 'coleccionista'}`}
        description={query.data.email}
        className={styles.heading}
      />

      {!query.data.emailVerified && (
        <Notice className={styles.verifyNotice}>
          Tu email todavía no está verificado.{' '}
          <Link href="/auth/verify-email">Verificar ahora</Link>
        </Notice>
      )}

      <div className={styles.accountCards}>
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const title =
            'dynamic' in tile && tile.dynamic && loyalty.data
              ? `${loyalty.data.account.available} puntos disponibles`
              : tile.title;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className={`${styles.card} ${styles[tile.tone]}`}
            >
              <span className={styles.cardIcon} aria-hidden="true">
                <Icon size={20} />
              </span>
              <strong>{title}</strong>
              <small>{tile.description}</small>
            </Link>
          );
        })}
      </div>

      <div className={styles.accountActions}>
        <a className="button button-secondary" href={googleAuthUrl()}>
          Vincular Google
        </a>
        <Button variant="ghost" onClick={() => void handleLogout()}>
          <LogOut size={14} aria-hidden="true" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
