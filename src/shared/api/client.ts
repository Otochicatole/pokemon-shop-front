import { config } from '@/shared/config/env';
import { getSessionSyncGeneration, isCurrentSessionRequest } from '@/shared/auth/session-sync';
import { problemSchema } from './contracts';

export class ApiError extends Error {
  constructor(public readonly problem: { code: string; status: number; title: string; details?: unknown }) { super(problem.title); }
}

let csrfToken: string | null = null;

function userSessionChanged(title: string): never {
  csrfToken = null;
  throw new ApiError({ code: 'SESSION_CHANGED', status: 409, title });
}

function assertCurrentUserSession(requestGeneration: number) {
  if (isCurrentSessionRequest('user', requestGeneration)) return;
  userSessionChanged('La sesión cambió mientras se procesaba la solicitud');
}

function userApiUrl(path: string) {
  const base = typeof window === 'undefined' ? config.backendUrl : '';
  return path.startsWith('http') ? path : `${base}${config.apiBase}${path}`;
}

function actorId(payload: unknown, key: 'user' | 'admin') {
  if (!payload || typeof payload !== 'object') return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const actor = (data as Record<string, unknown>)[key];
  if (!actor || typeof actor !== 'object') return null;
  const id = (actor as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

function userAuthTransition(path: string, method: string) {
  return method === 'POST' && path === '/auth/login'
    ? 'login'
    : method === 'POST' && (path === '/auth/logout' || path === '/auth/reset-password')
      ? path === '/auth/reset-password' ? 'reset' : 'logout'
      : null;
}

async function stableUserSessionProbe() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const generation = getSessionSyncGeneration('user');
    const response = await fetch(userApiUrl('/auth/me'), {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const payload: unknown = response.ok ? await response.json().catch(() => null) : null;
    if (isCurrentSessionRequest('user', generation)) {
      return { status: response.status, actorId: actorId(payload, 'user') };
    }
  }
  userSessionChanged('La sesión continuó cambiando durante la verificación');
}

async function reconcileUserAuthSuccess(transition: NonNullable<ReturnType<typeof userAuthTransition>>, payload: unknown) {
  const probe = await stableUserSessionProbe();
  if (transition === 'logout') {
    if (probe.status !== 401) userSessionChanged('Otra sesión se encuentra activa');
    return;
  }
  if (transition === 'reset') {
    if (probe.status !== 401 && !probe.actorId) userSessionChanged('No se pudo confirmar el estado de la sesión');
    return;
  }
  const expectedActorId = actorId(payload, 'user');
  if (!expectedActorId || probe.actorId !== expectedActorId) {
    userSessionChanged('La sesión activa pertenece a otra cuenta');
  }
}

function reportUserUnauthorized(sessionGeneration: number) {
  csrfToken = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('card-shop:user-unauthorized', { detail: { sessionGeneration } }));
}

async function refreshCsrf(): Promise<string | null> {
  const csrf = await fetch(userApiUrl('/auth/csrf'), { credentials: 'include', cache: 'no-store' });
  const payload = await csrf.json().catch(() => ({})) as { data?: { csrfToken?: string | null }; csrfToken?: string | null };
  csrfToken = payload.data?.csrfToken ?? payload.csrfToken ?? null;
  return csrfToken;
}

async function readProblem(response: Response): Promise<ApiError> {
  const parsed = problemSchema.safeParse(await response.json().catch(() => ({ code: 'NETWORK_ERROR', status: response.status, title: 'No se pudo conectar' })));
  return new ApiError(parsed.success ? parsed.data : { code: 'HTTP_ERROR', status: response.status, title: 'No se pudo completar la solicitud' });
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, schema?: { parse: (value: unknown) => T }): Promise<T> {
  const requestSessionGeneration = getSessionSyncGeneration('user');
  const method = (init.method ?? 'GET').toUpperCase();
  const authTransition = userAuthTransition(path, method);
  if (method !== 'GET' && method !== 'HEAD') {
    if (!csrfToken) {
      await refreshCsrf();
      assertCurrentUserSession(requestSessionGeneration);
    }
  }
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (csrfToken && method !== 'GET' && method !== 'HEAD') headers.set('X-CSRF-Token', csrfToken);
  const requestInit = { ...init, headers, credentials: 'include', ...(typeof window === 'undefined' ? { next: { revalidate: 15 } } : {}) } as RequestInit;
  const url = userApiUrl(path);
  let response = await fetch(url, requestInit);
  if (!response.ok || !authTransition) assertCurrentUserSession(requestSessionGeneration);
  if (!response.ok) {
    const problem = await readProblem(response);
    assertCurrentUserSession(requestSessionGeneration);
    const csrfFailure = method !== 'GET' && method !== 'HEAD' && problem.problem.code === 'FORBIDDEN' && /csrf/i.test(problem.problem.title);
    if (csrfFailure) {
      assertCurrentUserSession(requestSessionGeneration);
      await refreshCsrf();
      assertCurrentUserSession(requestSessionGeneration);
      const retryHeaders = new Headers(init.headers);
      if (init.body && !(init.body instanceof FormData)) retryHeaders.set('Content-Type', 'application/json');
      if (csrfToken) retryHeaders.set('X-CSRF-Token', csrfToken);
      response = await fetch(url, { ...requestInit, headers: retryHeaders });
      if (!response.ok || !authTransition) assertCurrentUserSession(requestSessionGeneration);
      if (!response.ok) {
        const retryProblem = await readProblem(response);
        assertCurrentUserSession(requestSessionGeneration);
        if (response.status === 401) reportUserUnauthorized(requestSessionGeneration);
        throw retryProblem;
      }
    } else {
      if (response.status === 401) reportUserUnauthorized(requestSessionGeneration);
      throw problem;
    }
  }
  if (response.status === 204) {
    if (authTransition) await reconcileUserAuthSuccess(authTransition, null);
    else assertCurrentUserSession(requestSessionGeneration);
    return undefined as T;
  }
  const data: unknown = await response.json();
  if (authTransition) await reconcileUserAuthSuccess(authTransition, data);
  else assertCurrentUserSession(requestSessionGeneration);
  return schema ? schema.parse(data) : data as T;
}

export function resetCsrf() { csrfToken = null; }
export function setCsrf(value: string | null) { csrfToken = value; }
