import { config } from '@/shared/config/env';
import { getSessionSyncGeneration, isCurrentSessionRequest } from '@/shared/auth/session-sync';
import { z } from 'zod';

export const adminProblemSchema = z.object({
  code: z.string(),
  status: z.number(),
  title: z.string(),
  detail: z.string().optional(),
  requestId: z.string().optional(),
  details: z.unknown().optional(),
  issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() })).optional(),
});

export type AdminProblem = z.infer<typeof adminProblemSchema>;

export class AdminApiError extends Error {
  constructor(public readonly problem: AdminProblem) {
    super(problem.detail ?? problem.title);
    this.name = 'AdminApiError';
  }
}

let adminCsrfToken: string | null = null;

function adminSessionChanged(title: string): never {
  adminCsrfToken = null;
  throw new AdminApiError({ code: 'SESSION_CHANGED', status: 409, title, detail: 'La solicitud anterior fue cancelada por seguridad.' });
}

function assertCurrentAdminSession(requestGeneration: number) {
  if (isCurrentSessionRequest('admin', requestGeneration)) return;
  adminSessionChanged('La sesión administrativa cambió');
}

function adminActorId(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const admin = (data as { admin?: unknown }).admin;
  if (!admin || typeof admin !== 'object') return null;
  const id = (admin as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

function apiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = typeof window === 'undefined' ? config.backendUrl : '';
  return `${base}${config.apiBase}${normalized}`;
}

function adminAuthTransition(path: string, method: string) {
  return method === 'POST' && path === '/admin/auth/login'
    ? 'login'
    : method === 'POST' && path === '/admin/auth/logout'
      ? 'logout'
      : null;
}

async function stableAdminSessionProbe() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const generation = getSessionSyncGeneration('admin');
    const response = await fetch(apiUrl('/admin/auth/me'), {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const payload: unknown = response.ok ? await response.json().catch(() => null) : null;
    if (isCurrentSessionRequest('admin', generation)) {
      return { status: response.status, actorId: adminActorId(payload) };
    }
  }
  adminSessionChanged('La sesión administrativa continuó cambiando durante la verificación');
}

async function reconcileAdminAuthSuccess(transition: NonNullable<ReturnType<typeof adminAuthTransition>>, payload: unknown) {
  const probe = await stableAdminSessionProbe();
  if (transition === 'logout') {
    if (probe.status !== 401) adminSessionChanged('Otra sesión administrativa se encuentra activa');
    return;
  }
  const expectedActorId = adminActorId(payload);
  if (!expectedActorId || probe.actorId !== expectedActorId) {
    adminSessionChanged('La sesión administrativa activa pertenece a otra cuenta');
  }
}

async function readProblem(response: Response): Promise<AdminApiError> {
  const payload: unknown = await response.json().catch(() => ({
    code: 'NETWORK_ERROR',
    status: response.status,
    title: 'No se pudo conectar con el servidor',
  }));
  const parsed = adminProblemSchema.safeParse(payload);
  return new AdminApiError(parsed.success ? parsed.data : {
    code: 'HTTP_ERROR',
    status: response.status,
    title: 'No se pudo completar la operación',
  });
}

export async function refreshAdminCsrf(): Promise<string | null> {
  const response = await fetch(apiUrl('/admin/auth/csrf'), {
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    if (response.status === 401) {
      adminCsrfToken = null;
      return null;
    }
    throw await readProblem(response);
  }
  const payload = await response.json().catch(() => ({})) as { data?: { csrfToken?: string | null } };
  adminCsrfToken = payload.data?.csrfToken ?? null;
  return adminCsrfToken;
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
  schema?: { parse: (value: unknown) => T },
): Promise<T> {
  const requestSessionGeneration = getSessionSyncGeneration('admin');
  const method = (init.method ?? 'GET').toUpperCase();
  const authTransition = adminAuthTransition(path, method);
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (isMutation && !adminCsrfToken) {
    await refreshAdminCsrf();
    assertCurrentAdminSession(requestSessionGeneration);
  }

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (isMutation && adminCsrfToken) headers.set('X-CSRF-Token', adminCsrfToken);

  const request: RequestInit = { ...init, method, headers, credentials: 'include', cache: 'no-store' };
  let response = await fetch(apiUrl(path), request);
  if (!response.ok || !authTransition) assertCurrentAdminSession(requestSessionGeneration);
  if (!response.ok) {
    let problem = await readProblem(response);
    assertCurrentAdminSession(requestSessionGeneration);
    const csrfFailure = isMutation && problem.problem.status === 403 && /csrf/i.test(`${problem.problem.title} ${problem.problem.detail ?? ''}`);
    if (csrfFailure) {
      assertCurrentAdminSession(requestSessionGeneration);
      await refreshAdminCsrf();
      assertCurrentAdminSession(requestSessionGeneration);
      const retryHeaders = new Headers(headers);
      if (adminCsrfToken) retryHeaders.set('X-CSRF-Token', adminCsrfToken);
      response = await fetch(apiUrl(path), { ...request, headers: retryHeaders });
      if (!response.ok || !authTransition) assertCurrentAdminSession(requestSessionGeneration);
      if (!response.ok) {
        problem = await readProblem(response);
        assertCurrentAdminSession(requestSessionGeneration);
      }
      else problem = null as unknown as AdminApiError;
    }
    if (!response.ok) {
      if (problem.problem.status === 401 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('card-shop:admin-unauthorized', { detail: { sessionGeneration: requestSessionGeneration } }));
      }
      throw problem;
    }
  }

  if (response.status === 204) {
    if (authTransition) await reconcileAdminAuthSuccess(authTransition, null);
    else assertCurrentAdminSession(requestSessionGeneration);
    return undefined as T;
  }
  const payload: unknown = await response.json();
  if (authTransition) await reconcileAdminAuthSuccess(authTransition, payload);
  else assertCurrentAdminSession(requestSessionGeneration);
  return schema ? schema.parse(payload) : payload as T;
}

export function setAdminCsrf(token: string | null) {
  adminCsrfToken = token;
}

export function resetAdminCsrf() {
  adminCsrfToken = null;
}

export function adminErrorMessage(error: unknown) {
  if (error instanceof AdminApiError) return error.problem.detail ?? error.problem.title;
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}
