import { AdminSupportConversationView } from '@/features/admin-support';

export const metadata = { title: 'Conversación de soporte · CMS' };

export default async function SupportConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminSupportConversationView conversationId={id} />;
}

