'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, UserRound, Menu, X, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useCartStore } from '@/features/cart/infrastructure/store';
import { SessionMenu } from '@/features/auth/ui/session-menu';

export function Header() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = search.trim();
    router.push(value ? `/catalog?q=${encodeURIComponent(value)}` : '/catalog');
    setOpen(false);
  };
  return <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark">✦</span><span>Card Shop<small>objetos para coleccionar</small></span></Link>
        <nav className={`main-nav ${open ? 'is-open' : ''}`}>
          <Link href="/catalog" onClick={() => setOpen(false)}>Explorar</Link>
          <Link href="/catalog?kind=SINGLE_CARD" onClick={() => setOpen(false)}>Cartas</Link>
          <Link href="/catalog?kind=SEALED_PRODUCT" onClick={() => setOpen(false)}>Sellado</Link>
          <Link href="/account" onClick={() => setOpen(false)}>Mi cuenta</Link>
        </nav>
        <div className="header-actions">
          <SessionMenu />
          <form className="header-search" onSubmit={submitSearch}><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cartas..." aria-label="Buscar cartas" /></form>
          <Link href="/account" className="icon-link" aria-label="Mi cuenta"><UserRound size={18} /></Link>
          <Link href="/cart" className="cart-link" aria-label={`Carrito, ${count} productos`}><ShoppingBag size={18} /><span>{count}</span></Link>
          <button className="menu-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>
    </header>;
}
