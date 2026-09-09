'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, ClipboardList, CreditCard, Gauge, History, PackageSearch, Truck, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell, type AdminNavigationItem } from '@/components/admin';
import { adminErrorMessage } from '@/shared/admin/client';
import type { AdminIdentity } from '../domain/contracts';
import { getAdminMe, logoutAdmin } from '../infrastructure/api';

const navigation: AdminNavigationItem[] = [
  { href: '/admin', label: 'Dashboard', icon: <Gauge size={18} /> },
  { href: '/admin/products', label: 'Productos', icon: <PackageSearch size={18} /> },
  { href: '/admin/inventory', label: 'Inventario', icon: <Boxes size={18} /> },
  { href: '/admin/orders', label: 'Órdenes', icon: <ClipboardList size={18} /> },
  { href: '/admin/payments', label: 'Pagos', icon: <CreditCard size={18} /> },
  { href: '/admin/fulfillment', label: 'Envíos y retiro', icon: <Truck size={18} /> },
  { href: '/admin/customers', label: 'Clientes', icon: <UsersRound size={18} /> },
  { href: '/admin/audit', label: 'Auditoría', icon: <History size={18} /> },
];

export function AdminAppShell({ initialAdmin, children }: { initialAdmin: AdminIdentity; children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ['admin', 'session'], queryFn: getAdminMe, initialData: initialAdmin, retry: false, refetchInterval: 60_000 });
  useEffect(() => {
    const unauthorized = () => { queryClient.removeQueries({ queryKey: ['admin'] }); router.replace('/admin/login'); router.refresh(); };
    window.addEventListener('card-shop:admin-unauthorized', unauthorized);
    return () => window.removeEventListener('card-shop:admin-unauthorized', unauthorized);
  }, [queryClient, router]);
  const logout = async () => {
    try {
      await logoutAdmin();
      queryClient.removeQueries({ queryKey: ['admin'] });
      router.replace('/admin/login');
      router.refresh();
    } catch (error) {
      toast.error(adminErrorMessage(error));
    }
  };
  const admin = session.data ?? initialAdmin;
  return <AdminShell adminName={admin.name?.trim() || 'Superadmin'} adminEmail={admin.email} navigation={navigation} onLogout={logout}>{children}</AdminShell>;
}
