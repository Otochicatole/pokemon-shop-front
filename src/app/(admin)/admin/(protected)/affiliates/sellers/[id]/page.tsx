import { AdminAffiliateOperations } from '@/features/admin-affiliates';

export default async function AffiliateSellerDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminAffiliateOperations section="sellers" id={id} />; }
