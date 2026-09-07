'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMe, logout } from '../infrastructure/api';

export function SessionMenu() {
  const router = useRouter(); const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const handleLogout = async () => {
    try { await logout(); queryClient.setQueryData(['me'], null); queryClient.removeQueries({ queryKey: ['me'] }); router.replace('/'); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión'); }
  };
  if (query.isLoading) return null;
  if (!query.data) return <Link href="/auth/login" className="header-login">Ingresar</Link>;
  return <div className="session-menu"><Link href="/account">Hola, {query.data.name?.split(' ')[0] ?? 'coleccionista'}</Link><button type="button" onClick={() => void handleLogout()}>Salir</button></div>;
}
