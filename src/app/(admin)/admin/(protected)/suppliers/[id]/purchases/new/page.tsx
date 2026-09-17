import { SupplierPurchaseFormView } from '@/features/supplier-management';

export const metadata = { title: 'Registrar compra · CMS' };

export default async function NewSupplierPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierPurchaseFormView supplierId={id} />;
}
