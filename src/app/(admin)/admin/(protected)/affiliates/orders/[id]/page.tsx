import { AdminAffiliateOperations } from '@/features/admin-affiliates';

export default async function AffiliateOrderDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminAffiliateOperations section="orders" id={id} />; }
