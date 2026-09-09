import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminFetch, resetAdminCsrf } from '@/shared/admin/client';
import { resetCsrf, setCsrf } from '@/shared/api/client';

describe('isolated admin HTTP client', () => {
  afterEach(() => { vi.restoreAllMocks(); resetAdminCsrf(); resetCsrf(); });

  it('requests and sends the admin CSRF token, never the storefront token', async () => {
    setCsrf('storefront-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: 'admin-token' }, meta: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'ok' }, meta: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await adminFetch('/admin/products', { method: 'POST', body: JSON.stringify({ name: 'Demo' }) });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v2/admin/auth/csrf', expect.objectContaining({ cache: 'no-store', credentials: 'include' }));
    const mutation = fetchMock.mock.calls[1];
    expect(mutation?.[0]).toBe('/api/v2/admin/products');
    const headers = new Headers((mutation?.[1] as RequestInit).headers);
    expect(headers.get('X-CSRF-Token')).toBe('admin-token');
    expect(headers.get('X-CSRF-Token')).not.toBe('storefront-token');
  });

  it('emits an unauthorized event for an expired admin session', async () => {
    const listener = vi.fn(); window.addEventListener('card-shop:admin-unauthorized', listener);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ code: 'UNAUTHORIZED', status: 401, title: 'Sesión vencida' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    await expect(adminFetch('/admin/dashboard')).rejects.toThrow('Sesión vencida');
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('card-shop:admin-unauthorized', listener);
  });
});

