import { InventoryManagementView } from '@/features/inventory-management';
import styles from './page.module.css';
export const metadata = { title: 'Inventario · CMS' };
export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ stock?: string }> }) { const { stock } = await searchParams; return <InventoryManagementView initialStock={['AVAILABLE', 'LOW', 'OUT'].includes(stock ?? '') ? stock : ''} />; }
