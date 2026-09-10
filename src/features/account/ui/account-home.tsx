'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMe, logout } from '@/features/auth/infrastructure/api';
import { Button } from '@/components/button';
import { getLoyaltyAccount } from '@/features/loyalty';

export function AccountHome() {
  const router = useRouter(); const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const loyalty = useQuery({ queryKey: ['loyalty-account', 'summary'], queryFn: () => getLoyaltyAccount(), enabled: Boolean(query.data), retry: false });
  const handleLogout = async () => { try { await logout(); queryClient.setQueryData(['me'], null); queryClient.removeQueries({ queryKey: ['me'] }); router.replace('/'); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión'); } };
  if (query.isLoading) return <div className="page-loading">Cargando cuenta…</div>;
  if (!query.data) return <div className="empty-state"><h1>Tu cuenta</h1><p>Ingresá para ver tus órdenes y gestionar tu acceso.</p><Link href="/auth/login?returnTo=/account" className="button button-primary">Ingresar</Link></div>;
  return <div className="account-home"><div className="section-heading"><p className="eyebrow">Cuenta personal</p><h1>Hola, {query.data.name ?? 'coleccionista'}</h1><p>{query.data.email}</p>{!query.data.emailVerified && <div className="notice">Tu email todavía no está verificado. <Link href="/auth/verify-email">Verificar ahora</Link></div>}</div><div className="account-cards"><Link href="/account/points" className="account-points-card"><span>◎</span><strong>{loyalty.data ? `${loyalty.data.account.available} puntos disponibles` : 'Mis puntos'}</strong><small>Revisá tu saldo, la regla vigente y cada movimiento.</small></Link><Link href="/account/orders"><span>↗</span><strong>Mis órdenes</strong><small>Consultá estados, pagos y comprobantes.</small></Link><Link href="/catalog"><span>◈</span><strong>Seguir explorando</strong><small>Encontrá tu próxima pieza.</small></Link></div><Button variant="ghost" onClick={() => void handleLogout()}>Cerrar sesión</Button></div>;
}
