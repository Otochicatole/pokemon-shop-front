import Link from 'next/link';
import { ArrowRight, Banknote, Coins, History } from 'lucide-react';
import { AdminPageHeader } from '@/components';
import styles from './configuration-home.module.css';

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
    <section className={styles.adminConfigDirectory} aria-labelledby="admin-config-directory-title">
      <header className={styles.adminConfigDirectoryHeader}>
        <div>
          <span className={styles.adminConfigDirectoryKicker}>Áreas disponibles</span>
          <h2 id="admin-config-directory-title">Elegí qué querés configurar</h2>
        </div>
        <span className={styles.adminConfigDirectoryCount}>{configurationItems.length} opciones</span>
      </header>
      <ul className={styles.adminConfigDirectoryList}>
        {configurationItems.map(({ href, category, title, description, icon: Icon }) => <li key={href}>
          <Link className={styles.adminConfigDirectoryLink} href={href}>
            <span className={styles.adminConfigDirectoryIcon}><Icon size={22} aria-hidden="true" /></span>
            <span className={styles.adminConfigDirectoryCopy}>
              <span className={styles.adminConfigDirectoryCategory}>{category}</span>
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
            <span className={styles.adminConfigDirectoryAction}>Administrar <ArrowRight size={18} aria-hidden="true" /></span>
          </Link>
        </li>)}
      </ul>
    </section>
  </>;
}
