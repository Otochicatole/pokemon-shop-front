import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AnchorHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminSupportConversationSchema,
  adminSupportConversationDetailEnvelopeSchema,
  adminSupportConversationListEnvelopeSchema,
} from '@/features/admin-support/domain/contracts';
import {
  createAdminSupportConversation,
  getAdminSupportConversation,
  getAdminSupportUnreadCount,
  listAdminSupportConversations,
  markAdminSupportConversationRead,
  sendAdminSupportMessage,
  updateAdminSupportConversationStatus,
} from '@/features/admin-support/infrastructure/api';
import { AdminSupportConversationView } from '@/features/admin-support/ui/admin-support-conversation';
import { AdminSupportInboxView } from '@/features/admin-support/ui/admin-support-inbox';

const push = vi.fn();

vi.mock('next/link', () => ({ default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/features/customer-management/infrastructure/api', () => ({ listAdminCustomers: vi.fn() }));
vi.mock('@/features/admin-support/infrastructure/api', () => ({
  createAdminSupportConversation: vi.fn(),
  getAdminSupportConversation: vi.fn(),
  getAdminSupportUnreadCount: vi.fn(),
  listAdminSupportConversations: vi.fn(),
  markAdminSupportConversationRead: vi.fn(),
  sendAdminSupportMessage: vi.fn(),
  updateAdminSupportConversationStatus: vi.fn(),
}));

const conversation = {
  id: 'conversation-1',
  status: 'IN_PROGRESS' as const,
  subject: 'Problema con mi pedido',
  user: { id: 'user-1', name: 'Misty', email: 'misty@example.test' },
  createdByType: 'USER' as const,
  lastMessageAt: '2026-09-09T20:00:00.000Z',
  lastMessagePreview: 'Necesito ayuda con la entrega',
  createdAt: '2026-09-09T19:55:00.000Z',
  updatedAt: '2026-09-09T20:00:00.000Z',
  unreadCount: 1,
};

const customerMessage = {
  id: 'message-1',
  conversationId: conversation.id,
  senderType: 'USER' as const,
  sender: { id: 'user-1', name: 'Misty' },
  content: 'Necesito ayuda con la entrega',
  createdAt: conversation.lastMessageAt,
};

function renderWithQueryClient(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe('administrative support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAdminSupportConversations).mockResolvedValue({ data: [conversation], nextCursor: null });
    vi.mocked(getAdminSupportUnreadCount).mockResolvedValue(1);
    vi.mocked(getAdminSupportConversation).mockResolvedValue({ conversation, messages: [customerMessage], nextCursor: null });
    vi.mocked(markAdminSupportConversationRead).mockResolvedValue({ conversationId: conversation.id, readAt: conversation.updatedAt, unreadCount: 0 });
    vi.mocked(sendAdminSupportMessage).mockResolvedValue({ ...customerMessage, id: 'message-2', senderType: 'ADMIN', sender: { id: 'admin-1', name: 'Admin' }, content: 'Ya lo revisamos.' });
    vi.mocked(updateAdminSupportConversationStatus).mockResolvedValue(conversation);
    vi.mocked(createAdminSupportConversation).mockResolvedValue(conversation);
  });

  it('parses list and detail payloads with unread state and all workflow statuses', () => {
    const list = adminSupportConversationListEnvelopeSchema.parse({ data: [conversation], meta: { nextCursor: null } });
    const detail = adminSupportConversationDetailEnvelopeSchema.parse({ data: { conversation, messages: [customerMessage] }, meta: { nextCursor: null } });
    expect(list.data[0]?.status).toBe('IN_PROGRESS');
    expect(detail.data.messages[0]).toMatchObject({ senderType: 'USER', content: 'Necesito ayuda con la entrega' });
  });

  it('accepts conversations without a last message preview', () => {
    const parsed = adminSupportConversationSchema.parse({ ...conversation, lastMessagePreview: null });
    expect(parsed.lastMessagePreview).toBeNull();
  });

  it('renders the inbox with unread indicators and a link to the conversation', async () => {
    renderWithQueryClient(<AdminSupportInboxView />);
    expect(await screen.findByRole('link', { name: 'Problema con mi pedido' })).toHaveAttribute('href', '/admin/support/conversation-1');
    expect(screen.getByLabelText('1 mensajes sin leer')).toBeInTheDocument();
    expect(screen.getAllByText('En curso').some((node) => node.classList.contains('admin-badge'))).toBe(true);
  });

  it('marks incoming messages as read and sends an administrative reply', async () => {
    renderWithQueryClient(<AdminSupportConversationView conversationId={conversation.id} />);
    expect(await screen.findByText('Necesito ayuda con la entrega')).toBeInTheDocument();
    await waitFor(() => expect(markAdminSupportConversationRead).toHaveBeenCalledWith(conversation.id, customerMessage.id));
    fireEvent.change(screen.getByLabelText('Responder al cliente'), { target: { value: 'Ya lo revisamos.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(sendAdminSupportMessage).toHaveBeenCalledWith(conversation.id, 'Ya lo revisamos.', expect.any(String)));
  });
});
