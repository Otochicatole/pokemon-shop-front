'use client';

import Link from 'next/link';
import { Menu, UserRound, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { CartIndicator } from './CartIndicator';
import { LoyaltyPointsIndicator } from '@/features/loyalty';
import { NotificationBell } from '@/features/notifications';
import { config } from '@/shared/config/env';
import styles from './Header.module.css';

export function Header({ cartCount = 0, sessionSlot, className = '', showAffiliateNav = false }: { cartCount?: number; sessionSlot?: ReactNode; className?: string; showAffiliateNav?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const backdropPointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const onResize = () => {
      if (window.matchMedia('(min-width: 761px)').matches) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`.${styles.mobileNavPanel}`)) return;
      event.preventDefault();
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [open]);

  const links = (
    <>
      <Link href="/" onClick={close}>Inicio</Link>
      <Link href="/catalog" onClick={close}>Catálogo</Link>
      {showAffiliateNav && <Link href="/affiliate" onClick={close}>Vender</Link>}
    </>
  );

  return (
    <div className={`${styles.headerShell} ${open ? styles.isMenuOpen : ''} ${className}`.trim()}>
      <header className={`${styles.siteHeader} site-header`}>
        <div className={`${styles.headerInner} header-inner`}>
          <Link href="/" className={`${styles.brand} brand`} onClick={close}>
            <span className={`${styles.brandMark} brand-mark`}>✦</span>
            <span>{config.storeName}<small>objetos para coleccionar</small></span>
          </Link>
          <nav className={`${styles.mainNav} ${styles.desktopNav} main-nav`} aria-label="Navegación principal">
            {links}
          </nav>
          <div className={`${styles.headerActions} header-actions`}>
            {sessionSlot ?? <Link href="/account" className={`${styles.iconLink} icon-link`} aria-label="Mi cuenta"><UserRound size={18} /></Link>}
            <NotificationBell />
            <LoyaltyPointsIndicator />
            <CartIndicator count={cartCount} />
            <button type="button" className={`${styles.menuToggle} menu-toggle`} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>
      {open ? (
        <>
          <button
            type="button"
            className={styles.navBackdrop}
            aria-label="Cerrar menú"
            onPointerDown={(event) => { backdropPointer.current = { x: event.clientX, y: event.clientY }; }}
            onPointerUp={(event) => {
              const start = backdropPointer.current;
              backdropPointer.current = null;
              if (!start) return;
              if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
              close();
            }}
            onPointerCancel={() => { backdropPointer.current = null; }}
          />
          <nav className={`${styles.mainNav} ${styles.mobileNavPanel} main-nav is-open`} aria-label="Navegación principal">
            {links}
          </nav>
        </>
      ) : null}
    </div>
  );
}
