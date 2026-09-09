import { redirect } from 'next/navigation';
import { AdminAppShell, getAdminServerSession } from '@/features/admin-auth';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await getAdminServerSession();
  if (!admin) redirect('/admin/login');
  return <AdminAppShell initialAdmin={admin}>{children}</AdminAppShell>;
}
