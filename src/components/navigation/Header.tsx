'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, UserRound, X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { HeaderSearch } from './HeaderSearch';
import { CartIndicator } from './CartIndicator';
import { LoyaltyPointsIndicator } from '@/features/loyalty';

export function Header({ cartCount = 0, sessionSlot, className = '' }: { cartCount?: number; sessionSlot?: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false); const [search, setSearch] = useState(''); const router = useRouter();
  const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = search.trim(); router.push(value ? `/catalog?q=${encodeURIComponent(value)}` : '/catalog'); setOpen(false); };
  const close = () => setOpen(false);
  return <header className={`site-header ${className}`}><div className="header-inner"><Link href="/" className="brand" onClick={close}><span className="brand-mark">✦</span><span>Card Shop<small>objetos para coleccionar</small></span></Link><nav className={`main-nav ${open ? 'is-open' : ''}`} aria-label="Navegación principal"><Link href="/" onClick={close}>Inicio</Link><Link href="/catalog" onClick={close}>Catálogo</Link></nav><div className="header-actions"><HeaderSearch value={search} onChange={setSearch} onSubmit={submitSearch} />{sessionSlot ?? <Link href="/account" className="icon-link" aria-label="Mi cuenta"><UserRound size={18} /></Link>}<LoyaltyPointsIndicator /><CartIndicator count={cartCount} /><button className="menu-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Menu size={19} />}</button></div></div></header>;
}
