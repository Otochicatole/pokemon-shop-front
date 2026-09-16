import Link from 'next/link';
import styles from './affiliate-admin-navigation.module.css';

export type AffiliateAdminSection = 'overview' | 'sellers' | 'listings' | 'orders' | 'issues' | 'cancellations' | 'payouts' | 'settings';

const sections: Array<{ key: AffiliateAdminSection; label: string; href: string }> = [
  { key: 'overview', label: 'Resumen', href: '/admin/affiliates' },
  { key: 'sellers', label: 'Afiliados', href: '/admin/affiliates/sellers' },
  { key: 'listings', label: 'Publicaciones', href: '/admin/affiliates/listings' },
  { key: 'orders', label: 'Ventas', href: '/admin/affiliates/orders' },
  { key: 'issues', label: 'Incidencias', href: '/admin/affiliates/issues' },
  { key: 'cancellations', label: 'Cancelaciones', href: '/admin/affiliates/cancellations' },
  { key: 'payouts', label: 'Retiros', href: '/admin/affiliates/payouts' },
  { key: 'settings', label: 'Configuración', href: '/admin/affiliates/settings' },
];

export function AffiliateAdminNavigation({ active }: { active: AffiliateAdminSection }) {
  return <aside className="affiliate-admin-navigation" aria-label="Navegación del módulo de afiliados">
    <div className="affiliate-admin-navigation-heading">
      <span className="admin-panel-kicker">Marketplace</span>
      <strong>Gestión de afiliados</strong>
    </div>
    <nav>
      {sections.map((section) => <Link key={section.key} href={section.href} className={section.key === active ? 'is-active' : ''} aria-current={section.key === active ? 'page' : undefined}>{section.label}</Link>)}
    </nav>
  </aside>;
}
