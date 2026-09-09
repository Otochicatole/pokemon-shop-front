import { redirect } from 'next/navigation';
import { AdminLoginForm, getAdminServerSession } from '@/features/admin-auth';

export const metadata = { title: 'Acceso administrativo' };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const admin = await getAdminServerSession();
  if (admin) redirect('/admin');
  const query = await searchParams;
  return <main className="admin-login-page"><section className="admin-login-intro"><div className="admin-brand"><span className="admin-brand-mark">CS</span><span>Card Shop<small>Centro de operaciones</small></span></div><div><h1>Controlá la <span>colección.</span></h1><p>Productos, stock, órdenes y pagos en una superficie de trabajo segura.</p></div><span className="admin-login-signal">Sistema preparado</span></section><div className="admin-login-panel"><AdminLoginForm returnTo={query.returnTo} /></div></main>;
}
