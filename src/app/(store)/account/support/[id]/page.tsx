import { SupportConversationView } from '@/features/support';

export default async function SupportConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <section className="support-page-container"><SupportConversationView id={id} /></section>;
}
