import { AdminAffiliateOperations } from '@/features/admin-affiliates';

export default async function AffiliateIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminAffiliateOperations section="issues" id={id} />;
}
