'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getMe, logout } from '../infrastructure/api';
export function SessionMenu() { const query = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false }); if (query.isLoading) return null; if (!query.data) return <Link href="/auth/login" className="header-login">Ingresar</Link>; return <div className="session-menu"><Link href="/account">Hola, {query.data.name?.split(' ')[0] ?? 'coleccionista'}</Link><button onClick={() => logout().then(() => query.refetch())}>Salir</button></div>; }
