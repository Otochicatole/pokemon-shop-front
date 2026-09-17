'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NotificationBell } from '@/features/notifications';

import styles from './AdminShell.module.css';

export interface AdminNavigationItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export function AdminShell({ adminName, adminEmail, navigation, onLogout, children }: { adminName: string; adminEmail: string; navigation: AdminNavigationItem[]; onLogout: () => void | Promise<void>; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeMenu = () => setMenuOpen(false);
  const labels: Record<string, string> = {
    products: 'Productos',
    new: 'Nuevo',
    inventory: 'Inventario',
    suppliers: 'Proveedores',
    news: 'Noticias',
    affiliates: 'Afiliados',
    sellers: 'Vendedores',
    listings: 'Publicaciones',
    orders: 'Órdenes',
    payments: 'Pagos',
    fulfillment: 'Envíos',
    customers: 'Clientes',
    loyalty: 'Fidelidad',
    config: 'Configuración',
    transfer: 'Transferencia',
    support: 'Soporte',
    notifications: 'Notificaciones',
    audit: 'Auditoría',
    settings: 'Ajustes',
    payouts: 'Retiros',
    issues: 'Incidencias',
    cancellations: 'Cancelaciones',
  };
  const pathSegments = pathname.split('/').filter(Boolean).slice(1);
  const crumbs = pathSegments.map((segment, index) => ({ href: `/admin/${pathSegments.slice(0, index + 1).join('/')}`, label: labels[segment] ?? 'Detalle' }));
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); return; }
      if (event.key !== 'Tab' || !sidebarRef.current) return;
      const focusable = [...sidebarRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      const first = focusable[0]; const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = overflow; previous?.focus(); };
  }, [menuOpen]);
  return (
    <div className={styles.adminShell}>
      <a className={styles.adminSkipLink} href="#admin-content">Saltar al contenido</a>
      {menuOpen && <button className={styles.adminSidebarBackdrop} aria-label="Cerrar navegación" onClick={() => setMenuOpen(false)} />}
      <aside ref={sidebarRef} className={`${styles.adminSidebar} ${menuOpen ? styles.isOpen : ''}`} aria-label="Navegación administrativa">
        <div className={styles.adminBrand}>
          <span className={styles.adminBrandMark}><ShieldCheck size={21} /></span>
          <span>Card Shop<small>Control central</small></span>
          <button type="button" className={styles.adminSidebarClose} onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>
        <nav className={styles.adminNavigation}>
          {navigation.map((item) => {
            const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                aria-current={active ? 'page' : undefined}
                className={active ? styles.isActive : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.adminProfile}>
          <div><strong>{adminName}</strong><span>{adminEmail}</span></div>
          <button type="button" onClick={() => void onLogout()}><LogOut size={16} />Cerrar sesión</button>
        </div>
      </aside>
      <div className={styles.adminWorkspace}>
        <header className={styles.adminTopbar}>
          <button type="button" className={styles.adminMenuButton} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-label="Abrir menú"><Menu size={20} /></button>
          <nav className={styles.adminBreadcrumbs} aria-label="Migas de pan">
            <Link href="/admin">Admin</Link>
            {crumbs.map((crumb, index) => (
              <span key={crumb.href}>
                <b aria-hidden="true">/</b>
                {index === crumbs.length - 1 ? <strong aria-current="page">{crumb.label}</strong> : <Link href={crumb.href}>{crumb.label}</Link>}
              </span>
            ))}
          </nav>
          <div className={styles.adminTopbarActions}>
            <NotificationBell variant="admin" />
            <Link href="/" target="_blank" rel="noreferrer">Ver tienda ↗</Link>
          </div>
        </header>
        <main id="admin-content" className={styles.adminContent}>{children}</main>
      </div>
    </div>
  );
}
