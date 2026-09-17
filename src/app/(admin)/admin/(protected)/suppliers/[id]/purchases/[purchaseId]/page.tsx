import { SupplierPurchaseDetailView } from '@/features/supplier-management';

export const metadata = { title: 'Detalle de compra · CMS' };

export default async function SupplierPurchaseDetailPage({ params }: { params: Promise<{ id: string; purchaseId: string }> }) {
  const { id, purchaseId } = await params;
  return <SupplierPurchaseDetailView supplierId={id} purchaseId={purchaseId} />;
}
