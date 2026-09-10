import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportCenter } from '@/features/support/ui/support-center';
import { SupportConversationView } from '@/features/support/ui/support-conversation';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getMe: vi.fn(),
  listConversations: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  sendMessage: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock('next/link', () => ({ default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) => <a {...props}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/auth/infrastructure/api', () => ({ getMe: mocks.getMe }));
vi.mock('@/features/support/infrastructure/api', () => ({
  listSupportConversations: mocks.listConversations,
  createSupportConversation: mocks.createConversation,
  getSupportConversation: mocks.getConversation,
  sendSupportMessage: mocks.sendMessage,
  markSupportConversationRead: mocks.markRead,
}));

const conversation = {
  id: 'case-1',
  status: 'OPEN' as const,
  subject: 'Mi pedido no llegó',
  user: { id: 'user-1', name: 'Misty', email: 'misty@example.test' },
  createdByType: 'USER' as const,
  lastMessageAt: '2026-09-09T18:00:00.000Z',
  lastMessagePreview: 'Necesito ayuda con el envío',
  createdAt: '2026-09-09T18:00:00.000Z',
  updatedAt: '2026-09-09T18:00:00.000Z',
  unreadCount: 1,
};

function renderWithQueryClient(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

describe('customer support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMe.mockResolvedValue({ id: 'user-1', name: 'Misty', email: 'misty@example.test', emailVerified: true });
    mocks.listConversations.mockResolvedValue({ conversations: [conversation], nextCursor: null });
    mocks.createConversation.mockResolvedValue(conversation);
    mocks.getConversation.mockResolvedValue({
      conversation,
      messages: [
        { id: 'message-1', conversationId: conversation.id, senderType: 'USER', sender: { id: 'user-1', name: 'Misty' }, content: 'Necesito ayuda con el envío', createdAt: '2026-09-09T18:00:00.000Z' },
        { id: 'message-2', conversationId: conversation.id, senderType: 'ADMIN', sender: { id: 'admin-1', name: 'Equipo Rocket' }, content: 'Ya lo estamos revisando.', createdAt: '2026-09-09T18:05:00.000Z' },
      ],
      nextCursor: null,
    });
    mocks.sendMessage.mockResolvedValue({ id: 'message-3', conversationId: conversation.id, senderType: 'USER', sender: { id: 'user-1', name: 'Misty' }, content: 'Gracias', createdAt: '2026-09-09T18:06:00.000Z' });
    mocks.markRead.mockResolvedValue({ conversationId: conversation.id, readAt: '2026-09-09T18:05:00.000Z', unreadCount: 0 });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('lists conversations and creates a new support case', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SupportCenter />);

    expect(await screen.findByRole('link', { name: /Mi pedido no llegó/i })).toHaveAttribute('href', '/account/support/case-1');
    await user.type(screen.getByRole('textbox', { name: /Asunto/i }), 'Cobro duplicado');
    await user.type(screen.getByRole('textbox', { name: /Mensaje/i }), 'Veo dos cargos para la misma compra.');
    await user.click(screen.getByRole('button', { name: 'Iniciar conversación' }));

    await waitFor(() => expect(mocks.createConversation).toHaveBeenCalledWith({ subject: 'Cobro duplicado', message: 'Veo dos cargos para la misma compra.', clientMessageId: expect.any(String) }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/account/support/case-1'));
  });

  it('renders message history, marks admin replies as read, and sends a reply', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SupportConversationView id="case-1" />);

    expect(await screen.findByText('Ya lo estamos revisando.')).toBeInTheDocument();
    await waitFor(() => expect(mocks.markRead).toHaveBeenCalledWith('case-1', 'message-2'));
    await user.type(screen.getByLabelText('Responder'), 'Gracias');
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar mensaje' }).closest('form')!);

    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledWith('case-1', 'Gracias', expect.any(String)));
  });

  it('reuses a creation id after an error and replaces it when the draft changes', async () => {
    mocks.createConversation.mockReset();
    mocks.createConversation
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce(conversation);
    const user = userEvent.setup();
    renderWithQueryClient(<SupportCenter />);

    await user.type(await screen.findByRole('textbox', { name: /Asunto/i }), 'Cobro duplicado');
    await user.type(screen.getByRole('textbox', { name: /Mensaje/i }), 'Veo dos cargos.');
    const submit = screen.getByRole('button', { name: 'Iniciar conversación' });
    await user.click(submit);
    await waitFor(() => expect(mocks.createConversation).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(submit).toBeEnabled());
    const firstId = mocks.createConversation.mock.calls[0]?.[0].clientMessageId;

    await user.click(submit);
    await waitFor(() => expect(mocks.createConversation).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(submit).toBeEnabled());
    const retryId = mocks.createConversation.mock.calls[1]?.[0].clientMessageId;
    expect(retryId).toBe(firstId);

    await user.type(screen.getByRole('textbox', { name: /Mensaje/i }), ' Agrego el número de orden.');
    await user.click(submit);
    await waitFor(() => expect(mocks.createConversation).toHaveBeenCalledTimes(3));
    const editedId = mocks.createConversation.mock.calls[2]?.[0].clientMessageId;
    expect(editedId).not.toBe(firstId);
  });

  it('does not jump back to the bottom when older messages are loaded', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    mocks.getConversation.mockImplementation(async (_id: string, cursor?: string) => cursor ? {
      conversation,
      messages: [
        { id: 'message-0', conversationId: conversation.id, senderType: 'USER', sender: { id: 'user-1', name: 'Misty' }, content: 'Mensaje anterior', createdAt: '2026-09-09T17:55:00.000Z' },
      ],
      nextCursor: null,
    } : {
      conversation,
      messages: [
        { id: 'message-1', conversationId: conversation.id, senderType: 'USER', sender: { id: 'user-1', name: 'Misty' }, content: 'Necesito ayuda con el envío', createdAt: '2026-09-09T18:00:00.000Z' },
        { id: 'message-2', conversationId: conversation.id, senderType: 'ADMIN', sender: { id: 'admin-1', name: 'Equipo Rocket' }, content: 'Ya lo estamos revisando.', createdAt: '2026-09-09T18:05:00.000Z' },
      ],
      nextCursor: 'message-1',
    });

    const user = userEvent.setup();
    renderWithQueryClient(<SupportConversationView id="case-1" />);
    expect(await screen.findByText('Ya lo estamos revisando.')).toBeInTheDocument();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Cargar mensajes anteriores' }));
    expect(await screen.findByText('Mensaje anterior')).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
