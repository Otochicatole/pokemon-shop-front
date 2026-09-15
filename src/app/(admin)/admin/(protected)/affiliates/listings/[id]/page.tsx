import { AdminAffiliateOperations } from '@/features/admin-affiliates';

export default async function AffiliateListingDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminAffiliateOperations section="listings" id={id} />; }
