import { AdminProductEditor } from '@/features/product-management';
import styles from './page.module.css';
export const metadata = { title: 'Editar producto · CMS' };
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminProductEditor productId={id} />; }
