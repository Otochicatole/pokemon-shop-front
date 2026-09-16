import { AdminCustomerDetailView } from '@/features/customer-management';
import styles from './page.module.css';
export const metadata = { title: 'Detalle de cliente · CMS' };
export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminCustomerDetailView id={id} />; }

