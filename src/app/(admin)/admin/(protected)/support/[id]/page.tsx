import { AdminSupportConversationView } from '@/features/admin-support';
import styles from './page.module.css';

export const metadata = { title: 'Conversación de soporte · CMS' };

export default async function SupportConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminSupportConversationView conversationId={id} />;
}

