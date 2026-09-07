'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { getMe, logout } from '../infrastructure/api';

export function SessionMenu() {
  const router = useRouter(); const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const query = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOnOutsideClick); document.removeEventListener('keydown', closeOnEscape); };
  }, [open]);
  const handleLogout = async () => {
    try { await logout(); queryClient.setQueryData(['me'], null); queryClient.removeQueries({ queryKey: ['me'] }); router.replace('/'); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión'); }
  };
  if (query.isLoading) return <div className="session-menu"><button className="session-trigger" type="button" disabled aria-label="Cargando cuenta"><UserRound size={18} /></button></div>;
  if (!query.data) return <div className="session-menu" ref={menuRef}><button className="session-trigger" type="button" aria-label="Abrir menú de cuenta" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><UserRound size={18} /></button>{open && <div className="session-dropdown" role="menu"><p className="session-dropdown-name">Visitante</p><Link className="session-dropdown-login" href="/auth/login" role="menuitem" onClick={() => setOpen(false)}>Iniciar sesión</Link></div>}</div>;
  const displayName = query.data.name?.trim() || query.data.email.split('@')[0] || 'coleccionista';
  return <div className="session-menu" ref={menuRef}><button className="session-trigger" type="button" aria-label="Abrir menú de cuenta" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><UserRound size={18} /></button>{open && <div className="session-dropdown" role="menu"><p className="session-dropdown-name">{displayName}</p><Link href="/account" role="menuitem" onClick={() => setOpen(false)}>Mi cuenta</Link><button type="button" role="menuitem" onClick={() => void handleLogout()}>Cerrar sesión</button></div>}</div>;
}
