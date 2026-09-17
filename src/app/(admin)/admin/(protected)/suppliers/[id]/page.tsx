import { SupplierDetailView } from '@/features/supplier-management';

export const metadata = { title: 'Detalle de proveedor · CMS' };

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierDetailView id={id} />;
}
