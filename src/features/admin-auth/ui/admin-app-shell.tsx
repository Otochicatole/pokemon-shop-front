'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, ClipboardList, Coins, CreditCard, Gauge, Handshake, History, MessagesSquare, PackageSearch, Truck, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell, type AdminNavigationItem } from '@/components/admin';
import { adminErrorMessage } from '@/shared/admin/client';
import { publishSessionSync } from '@/shared/auth/session-sync';
import { clearAdminSessionCache } from '../application/session-cache';
import type { AdminIdentity } from '../domain/contracts';
import { getAdminMe, logoutAdmin } from '../infrastructure/api';

const navigation: AdminNavigationItem[] = [
  { href: '/admin', label: 'Dashboard', icon: <Gauge size={18} /> },
  { href: '/admin/products', label: 'Productos', icon: <PackageSearch size={18} /> },
  { href: '/admin/inventory', label: 'Inventario', icon: <Boxes size={18} /> },
  { href: '/admin/suppliers', label: 'Proveedores', icon: <Handshake size={18} /> },
  { href: '/admin/orders', label: 'Órdenes', icon: <ClipboardList size={18} /> },
  { href: '/admin/payments', label: 'Pagos', icon: <CreditCard size={18} /> },
  { href: '/admin/fulfillment', label: 'Envíos y retiro', icon: <Truck size={18} /> },
  { href: '/admin/customers', label: 'Clientes', icon: <UsersRound size={18} /> },
  { href: '/admin/support', label: 'Soporte', icon: <MessagesSquare size={18} /> },
  { href: '/admin/loyalty', label: 'Fidelidad', icon: <Coins size={18} /> },
  { href: '/admin/audit', label: 'Auditoría', icon: <History size={18} /> },
];

export function AdminAppShell({ initialAdmin, children }: { initialAdmin: AdminIdentity; children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ['admin', 'session'], queryFn: getAdminMe, initialData: initialAdmin, retry: false, refetchInterval: 60_000 });
  const logout = async () => {
    try {
      await logoutAdmin();
      clearAdminSessionCache(queryClient);
      publishSessionSync('admin', 'ended');
      router.replace('/admin/login');
      router.refresh();
    } catch (error) {
      toast.error(adminErrorMessage(error));
    }
  };
  const admin = session.data ?? initialAdmin;
  return <AdminShell adminName={admin.name?.trim() || 'Superadmin'} adminEmail={admin.email} navigation={navigation} onLogout={logout}>{children}</AdminShell>;
}
