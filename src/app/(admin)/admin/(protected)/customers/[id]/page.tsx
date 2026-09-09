import { AdminCustomerDetailView } from '@/features/customer-management';
export const metadata = { title: 'Detalle de cliente · CMS' };
export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminCustomerDetailView id={id} />; }

