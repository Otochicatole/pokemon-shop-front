import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { AdminLoginForm, getAdminServerSession } from '@/features/admin-auth';

import styles from './page.module.css';
import shell from '@/components/admin/AdminShell.module.css';
export const metadata = { title: 'Acceso administrativo' };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const admin = await getAdminServerSession();
  if (admin) redirect('/admin');
  const query = await searchParams;
  return (
    <main className={styles.adminLoginPage}>
      <section className={styles.adminLoginIntro}>
        <div className={shell.adminBrand}>
          <span className={shell.adminBrandMark}>
            <ShieldCheck size={21} aria-hidden="true" />
          </span>
          <span>
            Card Shop
            <small>Control central</small>
          </span>
        </div>
        <div>
          <h1>
            Controlá la <span>colección.</span>
          </h1>
          <p>Productos, stock, órdenes y pagos en una superficie de trabajo segura.</p>
        </div>
        <span className={styles.adminLoginSignal}>Sistema preparado</span>
      </section>
      <div className={styles.adminLoginPanel}>
        <AdminLoginForm returnTo={query.returnTo} />
      </div>
    </main>
  );
}
