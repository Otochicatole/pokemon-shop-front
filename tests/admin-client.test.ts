import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminFetch, resetAdminCsrf, setAdminCsrf } from '@/shared/admin/client';
import { apiFetch, resetCsrf, setCsrf } from '@/shared/api/client';
import { advanceSessionGeneration, publishSessionSync } from '@/shared/auth/session-sync';

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((next) => { resolve = next; });
  return { promise, resolve };
}

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

  it('emits a storefront unauthorized event for expired user sessions', async () => {
    const listener = vi.fn(); window.addEventListener('card-shop:user-unauthorized', listener);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ code: 'UNAUTHORIZED', status: 401, title: 'Sesión vencida' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    await expect(apiFetch('/account/orders')).rejects.toThrow('Sesión vencida');
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('card-shop:user-unauthorized', listener);
  });

  it('does not replay a user mutation after its session changes during a CSRF failure', async () => {
    setCsrf('user-token-a');
    const response = deferredResponse();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(response.promise);
    const request = apiFetch('/support/conversations/conversation-1/messages', { method: 'POST', body: JSON.stringify({ content: 'Cuenta A' }) });

    expect(fetchMock).toHaveBeenCalledOnce();
    publishSessionSync('user', 'changed');
    response.resolve(new Response(JSON.stringify({ code: 'FORBIDDEN', status: 403, title: 'Token CSRF inválido' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));

    await expect(request).rejects.toMatchObject({ problem: { code: 'SESSION_CHANGED' } });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not replay an admin mutation after its session changes during a CSRF failure', async () => {
    setAdminCsrf('admin-token-a');
    const response = deferredResponse();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(response.promise);
    const request = adminFetch('/admin/support/conversations/conversation-1/messages', { method: 'POST', body: JSON.stringify({ content: 'Cuenta A' }) });

    expect(fetchMock).toHaveBeenCalledOnce();
    publishSessionSync('admin', 'changed');
    response.resolve(new Response(JSON.stringify({ code: 'FORBIDDEN', status: 403, title: 'Token CSRF inválido' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));

    await expect(request).rejects.toMatchObject({ problem: { code: 'SESSION_CHANGED' } });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('discards a delayed successful response from the previous user', async () => {
    const response = deferredResponse();
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(response.promise);
    const request = apiFetch('/support/conversations');

    publishSessionSync('user', 'changed');
    response.resolve(new Response(JSON.stringify({ data: { private: 'Cuenta A' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(request).rejects.toMatchObject({ problem: { code: 'SESSION_CHANGED' } });
  });

  it('does not emit session-ended from a delayed 401 belonging to the previous user', async () => {
    const listener = vi.fn();
    window.addEventListener('card-shop:user-unauthorized', listener);
    const response = deferredResponse();
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(response.promise);
    const request = apiFetch('/support/conversations');

    publishSessionSync('user', 'changed');
    response.resolve(new Response(JSON.stringify({ code: 'UNAUTHORIZED', status: 401, title: 'Sesión anterior vencida' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));

    await expect(request).rejects.toMatchObject({ problem: { code: 'SESSION_CHANGED' } });
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('card-shop:user-unauthorized', listener);
  });

  it('accepts a user login whose own socket revoke advanced the epoch', async () => {
    setCsrf('user-token-a');
    const response = deferredResponse();
    const user = { id: 'user-b', email: 'b@example.test', name: 'B', emailVerified: true };
    const envelope = { data: { user, csrfToken: 'user-token-b' }, meta: {} };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user }, meta: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const request = apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email: user.email, password: 'secret' }) });

    advanceSessionGeneration('user');
    response.resolve(new Response(JSON.stringify(envelope), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(request).resolves.toEqual(envelope);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v2/auth/me');
  });

  it('accepts a user logout whose own socket revoke advanced the epoch', async () => {
    setCsrf('user-token');
    const response = deferredResponse();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'UNAUTHORIZED', status: 401, title: 'Sin sesión' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    const request = apiFetch('/auth/logout', { method: 'POST' });

    advanceSessionGeneration('user');
    response.resolve(new Response(null, { status: 204 }));

    await expect(request).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('accepts a password reset after revoke only when the cookie confirms no session', async () => {
    setCsrf('user-token');
    const response = deferredResponse();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'UNAUTHORIZED', status: 401, title: 'Sin sesión' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    const request = apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: 'reset-token', password: 'new-password' }) });

    advanceSessionGeneration('user');
    response.resolve(new Response(null, { status: 204 }));

    await expect(request).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('accepts an admin login whose own socket revoke advanced the epoch', async () => {
    setAdminCsrf('admin-token-a');
    const response = deferredResponse();
    const admin = { id: 'admin-b', email: 'b-admin@example.test', name: 'B', role: 'SUPER_ADMIN' };
    const envelope = { data: { admin, csrfToken: 'admin-token-b' }, meta: {} };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { admin }, meta: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const request = adminFetch('/admin/auth/login', { method: 'POST', body: JSON.stringify({ email: admin.email, password: 'secret' }) });

    advanceSessionGeneration('admin');
    response.resolve(new Response(JSON.stringify(envelope), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(request).resolves.toEqual(envelope);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v2/admin/auth/me');
  });

  it('accepts an admin logout whose own socket revoke advanced the epoch', async () => {
    setAdminCsrf('admin-token');
    const response = deferredResponse();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'UNAUTHORIZED', status: 401, title: 'Sin sesión' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    const request = adminFetch('/admin/auth/logout', { method: 'POST' });

    advanceSessionGeneration('admin');
    response.resolve(new Response(null, { status: 204 }));

    await expect(request).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a login response when the cookie now belongs to a different actor', async () => {
    setCsrf('user-token-a');
    const userB = { id: 'user-b', email: 'b@example.test', name: 'B', emailVerified: true };
    const userC = { id: 'user-c', email: 'c@example.test', name: 'C', emailVerified: true };
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user: userB } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user: userC } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(apiFetch('/auth/login', { method: 'POST', body: '{}' })).rejects.toMatchObject({ problem: { code: 'SESSION_CHANGED' } });
  });

  it('retries the identity probe when the user epoch changes during verification', async () => {
    setCsrf('user-token-a');
    const user = { id: 'user-b', email: 'b@example.test', name: 'B', emailVerified: true };
    const firstProbe = deferredResponse();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockReturnValueOnce(firstProbe.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const request = apiFetch('/auth/login', { method: 'POST', body: '{}' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    advanceSessionGeneration('user');
    firstProbe.resolve(new Response(JSON.stringify({ data: { user } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(request).resolves.toEqual({ data: { user } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries the identity probe when the admin epoch changes during verification', async () => {
    setAdminCsrf('admin-token-a');
    const admin = { id: 'admin-b', email: 'b-admin@example.test', name: 'B', role: 'SUPER_ADMIN' };
    const firstProbe = deferredResponse();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { admin } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockReturnValueOnce(firstProbe.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { admin } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const request = adminFetch('/admin/auth/login', { method: 'POST', body: '{}' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    advanceSessionGeneration('admin');
    firstProbe.resolve(new Response(JSON.stringify({ data: { admin } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(request).resolves.toEqual({ data: { admin } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('accepts resetting another account while the current user session remains active', async () => {
    setCsrf('user-token-y');
    const userY = { id: 'user-y', email: 'y@example.test', name: 'Y', emailVerified: true };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user: userY } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(apiFetch('/auth/reset-password', { method: 'POST', body: '{}' })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
