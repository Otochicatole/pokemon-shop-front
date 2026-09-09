import { AdminOrderDetailView } from '@/features/order-management';
export const metadata = { title: 'Detalle de orden · CMS' };
export default async function OrderDetailPage({ params }: { params: Promise<{ number: string }> }) { const { number } = await params; return <AdminOrderDetailView number={number} />; }

