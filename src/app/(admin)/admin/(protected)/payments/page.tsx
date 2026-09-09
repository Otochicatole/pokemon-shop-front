import { PaymentManagementView } from '@/features/payment-management';
export const metadata = { title: 'Pagos · CMS' };
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ queue?: string }> }) { const { queue } = await searchParams; const initialQueue = queue === 'MERCADO_PAGO_REVIEW' || queue === 'ALL' ? queue : 'TRANSFER_REVIEW'; return <PaymentManagementView initialQueue={initialQueue} />; }
