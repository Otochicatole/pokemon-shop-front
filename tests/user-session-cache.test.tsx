import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUserSessionCache } from '@/features/auth/application/session-cache';
import { AuthForm } from '@/features/auth/ui/auth-form';
import { OAuthResult } from '@/features/auth/ui/oauth-result';
import { SessionMenu } from '@/features/auth/ui/session-menu';
import { TokenForm } from '@/features/auth/ui/token-form';

const mocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  publishSessionSync: vi.fn(),
  apiFetch: vi.fn(),
  setCsrf: vi.fn(),
  resetCsrf: vi.fn(),
}));

vi.mock('next/link', () => ({ default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) => <a {...props}>{children}</a> }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/shared/auth/session-sync', () => ({ publishSessionSync: mocks.publishSessionSync }));
vi.mock('@/shared/api/client', () => ({ apiFetch: mocks.apiFetch, setCsrf: mocks.setCsrf, resetCsrf: mocks.resetCsrf }));
vi.mock('@/features/auth/infrastructure/api', () => ({
  forgotPassword: mocks.forgotPassword,
  getMe: mocks.getMe,
  login: mocks.login,
  logout: mocks.logout,
  register: mocks.register,
  resetPassword: mocks.resetPassword,
  verifyEmail: mocks.verifyEmail,
}));

const oldUser = { id: 'user-old', email: 'old@example.test', name: 'Old', emailVerified: true };
const newUser = { id: 'user-new', email: 'new@example.test', name: 'New', emailVerified: true };

function createPopulatedClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(['me'], oldUser);
  client.setQueryData(['support', 'conversations'], { private: 'old account' });
  client.setQueryData(['support-realtime', 'user', 'unread-count'], 9);
  client.setQueryData(['loyalty-account', 'summary'], { private: 'old account' });
  client.setQueryData(['orders'], { private: 'old account' });
  client.setQueryData(['order', 'A-001'], { private: 'old account' });
  return client;
}

function renderWithClient(node: ReactNode, client: QueryClient) {
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function ActiveUserSession() {
  useQuery({ queryKey: ['me'], queryFn: mocks.getMe, retry: false });
  return null;
}

describe('user-scoped session cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMe.mockResolvedValue(oldUser);
    mocks.login.mockResolvedValue(newUser);
    mocks.logout.mockResolvedValue(undefined);
    mocks.apiFetch.mockResolvedValue({ data: { csrfToken: 'csrf-next' } });
    mocks.resetPassword.mockResolvedValue(undefined);
  });

  it('removes identity, support history, and realtime counters together', () => {
    const client = createPopulatedClient();
    clearUserSessionCache(client);
    expect(client.getQueryData(['me'])).toBeUndefined();
    expect(client.getQueryData(['support', 'conversations'])).toBeUndefined();
    expect(client.getQueryData(['support-realtime', 'user', 'unread-count'])).toBeUndefined();
    expect(client.getQueryData(['loyalty-account', 'summary'])).toBeUndefined();
    expect(client.getQueryData(['orders'])).toBeUndefined();
    expect(client.getQueryData(['order', 'A-001'])).toBeUndefined();
  });

  it('clears the previous account support cache and installs the new identity before login navigation', async () => {
    const client = createPopulatedClient();
    let cacheAtNavigation: unknown;
    mocks.push.mockImplementation(() => {
      cacheAtNavigation = {
        me: client.getQueryData(['me']),
        support: client.getQueryData(['support', 'conversations']),
        realtime: client.getQueryData(['support-realtime', 'user', 'unread-count']),
        loyalty: client.getQueryData(['loyalty-account', 'summary']),
        orders: client.getQueryData(['orders']),
      };
    });
    const user = userEvent.setup();
    renderWithClient(<AuthForm mode="login" />, client);

    await user.type(screen.getByRole('textbox', { name: 'Email' }), newUser.email);
    await user.type(screen.getByLabelText('Contraseña'), 'password-1234');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/account'));
    expect(cacheAtNavigation).toEqual({ me: newUser, support: undefined, realtime: undefined, loyalty: undefined, orders: undefined });
    expect(mocks.publishSessionSync).toHaveBeenCalledWith('user', 'changed');
    expect(mocks.publishSessionSync.mock.invocationCallOrder[0]).toBeLessThan(mocks.push.mock.invocationCallOrder[0]);
  });

  it('clears user-scoped data before logout navigation from the session menu', async () => {
    const client = createPopulatedClient();
    let cacheAtNavigation: unknown;
    mocks.replace.mockImplementation(() => {
      cacheAtNavigation = {
        me: client.getQueryData(['me']),
        support: client.getQueryData(['support', 'conversations']),
        realtime: client.getQueryData(['support-realtime', 'user', 'unread-count']),
        loyalty: client.getQueryData(['loyalty-account', 'summary']),
        orders: client.getQueryData(['orders']),
      };
    });
    const user = userEvent.setup();
    renderWithClient(<SessionMenu />, client);

    await user.click(screen.getByRole('button', { name: 'Abrir menú de cuenta' }));
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/'));
    expect(cacheAtNavigation).toEqual({ me: undefined, support: undefined, realtime: undefined, loyalty: undefined, orders: undefined });
    expect(mocks.publishSessionSync).toHaveBeenCalledWith('user', 'ended');
  });

  it('clears the previous account immediately and publishes an OAuth account change', async () => {
    const client = createPopulatedClient();
    mocks.getMe.mockResolvedValue(newUser);

    renderWithClient(<OAuthResult result="success" />, client);

    expect(client.getQueryData(['me'])).toBeNull();
    expect(client.getQueryData(['support', 'conversations'])).toBeUndefined();
    expect(client.getQueryData(['support-realtime', 'user', 'unread-count'])).toBeUndefined();
    expect(client.getQueryData(['loyalty-account', 'summary'])).toBeUndefined();
    expect(client.getQueryData(['orders'])).toBeUndefined();
    expect(mocks.publishSessionSync).toHaveBeenCalledWith('user', 'changed');
    await waitFor(() => expect(client.getQueryData(['me'])).toEqual(newUser));
    expect(mocks.apiFetch).toHaveBeenCalledWith('/auth/csrf');
    expect(mocks.setCsrf).toHaveBeenCalledWith('csrf-next');
  });

  it('clears private data and broadcasts a revalidation hint after a successful password reset', async () => {
    const client = createPopulatedClient();
    const user = userEvent.setup();
    renderWithClient(<TokenForm mode="reset" />, client);

    await user.type(screen.getByRole('textbox', { name: 'Token' }), 'reset-token');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'new-password-1234');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Contraseña actualizada' })).toBeInTheDocument());
    expect(mocks.resetPassword).toHaveBeenCalledWith('reset-token', 'new-password-1234');
    expect(mocks.resetCsrf).toHaveBeenCalled();
    expect(client.getQueryData(['me'])).toBeNull();
    expect(client.getQueryData(['support', 'conversations'])).toBeUndefined();
    expect(client.getQueryData(['loyalty-account', 'summary'])).toBeUndefined();
    expect(mocks.publishSessionSync).toHaveBeenCalledWith('user', 'changed');
  });

  it('keeps the current actor when resetting a different account', async () => {
    const client = createPopulatedClient();
    mocks.getMe.mockResolvedValue(oldUser);
    const user = userEvent.setup();
    renderWithClient(<><ActiveUserSession /><TokenForm mode="reset" /></>, client);

    await user.type(screen.getByRole('textbox', { name: 'Token' }), 'other-account-token');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'new-password-1234');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Contraseña actualizada' })).toBeInTheDocument());
    expect(client.getQueryData(['me'])).toEqual(oldUser);
    expect(client.getQueryData(['support', 'conversations'])).toBeUndefined();
    expect(mocks.publishSessionSync).toHaveBeenCalledWith('user', 'changed');
  });
});
