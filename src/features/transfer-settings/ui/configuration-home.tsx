import Link from 'next/link';
import { ArrowRight, Banknote, Coins, History } from 'lucide-react';
import { AdminPageHeader } from '@/components';

const configurationItems = [
  {
    href: '/admin/config/transfer',
    category: 'Medios de pago',
    title: 'Datos de transferencia',
    description: 'Banco, titular, CBU y alias que se muestran al cliente.',
    icon: Banknote,
  },
  {
    href: '/admin/loyalty',
    category: 'Beneficios para clientes',
    title: 'Fidelidad',
    description: 'Configurá puntos, recompensas y reglas del programa de fidelidad.',
    icon: Coins,
  },
  {
    href: '/admin/audit',
    category: 'Control y seguimiento',
    title: 'Auditoría',
    description: 'Consultá las acciones administrativas realizadas por el equipo.',
    icon: History,
  },
] as const;

export function ConfigurationHomeView() {
  return <>
    <AdminPageHeader eyebrow="Administración" title="Configuración" description="Gestioná las opciones generales que impactan en la experiencia de compra." />
    <section className="admin-config-directory" aria-labelledby="admin-config-directory-title">
      <header className="admin-config-directory-header">
        <div>
          <span className="admin-config-directory-kicker">Áreas disponibles</span>
          <h2 id="admin-config-directory-title">Elegí qué querés configurar</h2>
        </div>
        <span className="admin-config-directory-count">{configurationItems.length} opciones</span>
      </header>
      <ul className="admin-config-directory-list">
        {configurationItems.map(({ href, category, title, description, icon: Icon }) => <li key={href}>
          <Link className="admin-config-directory-link" href={href}>
            <span className="admin-config-directory-icon"><Icon size={22} aria-hidden="true" /></span>
            <span className="admin-config-directory-copy">
              <span className="admin-config-directory-category">{category}</span>
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
            <span className="admin-config-directory-action">Administrar <ArrowRight size={18} aria-hidden="true" /></span>
          </Link>
        </li>)}
      </ul>
    </section>
  </>;
}
