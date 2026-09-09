import { InventoryManagementView } from '@/features/inventory-management';
export const metadata = { title: 'Inventario · CMS' };
export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ stock?: string }> }) { const { stock } = await searchParams; return <InventoryManagementView initialStock={['AVAILABLE', 'LOW', 'OUT'].includes(stock ?? '') ? stock : ''} />; }
