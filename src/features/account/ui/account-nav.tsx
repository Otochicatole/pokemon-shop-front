'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Bell, Coins, Headphones, LayoutGrid, Package, UserRound } from 'lucide-react';
import styles from './account-nav.module.css';

const links = [
  { href: '/account', label: 'Resumen', icon: LayoutGrid, exact: true },
  { href: '/account/orders', label: 'Órdenes', icon: Package },
  { href: '/account/points', label: 'Puntos', icon: Coins },
  { href: '/account/notifications', label: 'Avisos', icon: Bell },
  { href: '/account/support', label: 'Soporte', icon: Headphones },
  { href: '/account/profile', label: 'Perfil', icon: UserRound },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountNav() {
  const pathname = usePathname() ?? '/account';
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    // Scroll only the tab strip; preserve the reader's vertical page position.
    const navBox = nav.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    nav.scrollLeft += activeBox.left - navBox.left - (nav.clientWidth - activeBox.width) / 2;
  }, [pathname]);

  return (
    <nav className={styles.nav} data-account-nav aria-label="Secciones de mi cuenta">
      <div className={styles.inner} ref={navRef}>
        {links.map(({ href, label, icon: Icon, ...rest }) => {
          const exact = 'exact' in rest && rest.exact;
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.link} ${active ? styles.active : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
