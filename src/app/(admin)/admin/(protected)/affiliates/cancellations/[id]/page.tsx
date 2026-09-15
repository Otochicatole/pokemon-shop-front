import { AdminAffiliateOperations } from '@/features/admin-affiliates';

export default async function AffiliateCancellationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminAffiliateOperations section="cancellations" id={id} />;
}
