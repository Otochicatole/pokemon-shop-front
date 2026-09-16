import { AdminAffiliateOperations } from '@/features/admin-affiliates';
import styles from './page.module.css';

export default async function AffiliateSellerDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminAffiliateOperations section="sellers" id={id} />; }
