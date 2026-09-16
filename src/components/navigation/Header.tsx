'use client';

import Link from 'next/link';
import { Menu, UserRound, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { CartIndicator } from './CartIndicator';
import { LoyaltyPointsIndicator } from '@/features/loyalty';
import { NotificationBell } from '@/features/notifications';
import styles from './Header.module.css';

export function Header({ cartCount = 0, sessionSlot, className = '', showAffiliateNav = false }: { cartCount?: number; sessionSlot?: ReactNode; className?: string; showAffiliateNav?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onResize = () => {
      if (window.matchMedia('(min-width: 761px)').matches) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className={`${styles.siteHeader} site-header ${className}`.trim()}>
      <div className={`${styles.headerInner} header-inner`}>
        <Link href="/" className={`${styles.brand} brand`} onClick={close}>
          <span className={`${styles.brandMark} brand-mark`}>✦</span>
          <span>Card Shop<small>objetos para coleccionar</small></span>
        </Link>
        <nav className={`${styles.mainNav} ${open ? styles.isOpen : ''} main-nav ${open ? 'is-open' : ''}`.trim()} aria-label="Navegación principal">
          <Link href="/" onClick={close}>Inicio</Link>
          <Link href="/catalog" onClick={close}>Catálogo</Link>
          {showAffiliateNav && <Link href="/affiliate" onClick={close}>Vender</Link>}
        </nav>
        <div className={`${styles.headerActions} header-actions`}>
          {sessionSlot ?? <Link href="/account" className={`${styles.iconLink} icon-link`} aria-label="Mi cuenta"><UserRound size={18} /></Link>}
          <NotificationBell />
          <LoyaltyPointsIndicator />
          <CartIndicator count={cartCount} />
          <button type="button" className={`${styles.menuToggle} menu-toggle`} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      {open && <button type="button" className={styles.navBackdrop} aria-label="Cerrar menú" onClick={close} />}
    </header>
  );
}
