import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAdminSessionCache } from '@/features/admin-auth/application/session-cache';
import { AdminLoginForm } from '@/features/admin-auth/ui/admin-login-form';

const mocks = vi.hoisted(() => ({
  loginAdmin: vi.fn(),
  publishSessionSync: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess } }));
vi.mock('@/shared/admin/client', () => ({ adminErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Error' }));
vi.mock('@/shared/auth/session-sync', () => ({ publishSessionSync: mocks.publishSessionSync }));
vi.mock('@/features/admin-auth/infrastructure/api', () => ({ loginAdmin: mocks.loginAdmin }));

const oldAdmin = { id: 'admin-old', email: 'old-admin@example.test', name: 'Old Admin', role: 'SUPER_ADMIN' as const };
const newAdmin = { id: 'admin-new', email: 'new-admin@example.test', name: 'New Admin', role: 'SUPER_ADMIN' as const };

function createPopulatedClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(['admin', 'session'], oldAdmin);
  client.setQueryData(['admin', 'support', 'conversations'], { private: 'old account' });
  client.setQueryData(['admin', 'orders'], { private: 'old account' });
  client.setQueryData(['support-realtime', 'admin', 'unread-count'], 5);
  return client;
}

function renderWithClient(node: ReactNode, client: QueryClient) {
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe('admin-scoped session cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loginAdmin.mockResolvedValue(newAdmin);
  });

  it('removes the admin identity, private queries, and realtime counter on logout', () => {
    const client = createPopulatedClient();
    clearAdminSessionCache(client);

    expect(client.getQueryData(['admin', 'session'])).toBeUndefined();
    expect(client.getQueryData(['admin', 'support', 'conversations'])).toBeUndefined();
    expect(client.getQueryData(['admin', 'orders'])).toBeUndefined();
    expect(client.getQueryData(['support-realtime', 'admin', 'unread-count'])).toBeUndefined();
  });

  it('installs the new admin only after removing the previous account data and broadcasts the switch', async () => {
    const client = createPopulatedClient();
    let cacheAtNavigation: unknown;
    mocks.replace.mockImplementation(() => {
      cacheAtNavigation = {
        session: client.getQueryData(['admin', 'session']),
        support: client.getQueryData(['admin', 'support', 'conversations']),
        orders: client.getQueryData(['admin', 'orders']),
        realtime: client.getQueryData(['support-realtime', 'admin', 'unread-count']),
      };
    });
    const user = userEvent.setup();
    renderWithClient(<AdminLoginForm />, client);

    await user.type(screen.getByRole('textbox', { name: 'Email' }), newAdmin.email);
    await user.type(screen.getByLabelText('Contraseña'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin'));
    expect(cacheAtNavigation).toEqual({ session: newAdmin, support: undefined, orders: undefined, realtime: undefined });
    expect(mocks.publishSessionSync).toHaveBeenCalledWith('admin', 'changed');
    expect(mocks.publishSessionSync.mock.invocationCallOrder[0]).toBeLessThan(mocks.replace.mock.invocationCallOrder[0]);
  });
});
