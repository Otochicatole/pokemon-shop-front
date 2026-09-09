import { OrderDetail } from '@/features/orders/ui/order-detail';
export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) { return <section className="page-container"><OrderDetail number={(await params).number} /></section>; }
