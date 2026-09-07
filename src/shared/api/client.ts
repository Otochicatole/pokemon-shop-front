import { config } from '@/shared/config/env';
import { problemSchema } from './contracts';

export class ApiError extends Error {
  constructor(public readonly problem: { code: string; status: number; title: string; details?: unknown }) { super(problem.title); }
}

let csrfToken: string | null = null;

async function refreshCsrf(): Promise<string | null> {
  const base = typeof window === 'undefined' ? config.backendUrl : '';
  const csrf = await fetch(`${base}${config.apiBase}/auth/csrf`, { credentials: 'include', cache: 'no-store' });
  const payload = await csrf.json().catch(() => ({})) as { data?: { csrfToken?: string | null }; csrfToken?: string | null };
  csrfToken = payload.data?.csrfToken ?? payload.csrfToken ?? null;
  return csrfToken;
}

async function readProblem(response: Response): Promise<ApiError> {
  const parsed = problemSchema.safeParse(await response.json().catch(() => ({ code: 'NETWORK_ERROR', status: response.status, title: 'No se pudo conectar' })));
  return new ApiError(parsed.success ? parsed.data : { code: 'HTTP_ERROR', status: response.status, title: 'No se pudo completar la solicitud' });
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, schema?: { parse: (value: unknown) => T }): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    if (!csrfToken) await refreshCsrf();
  }
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (csrfToken && method !== 'GET' && method !== 'HEAD') headers.set('X-CSRF-Token', csrfToken);
  const base = typeof window === 'undefined' ? config.backendUrl : '';
  const requestInit = { ...init, headers, credentials: 'include', ...(typeof window === 'undefined' ? { next: { revalidate: 15 } } : {}) } as RequestInit;
  const url = path.startsWith('http') ? path : `${base}${config.apiBase}${path}`;
  let response = await fetch(url, requestInit);
  if (!response.ok) {
    const problem = await readProblem(response);
    const csrfFailure = method !== 'GET' && method !== 'HEAD' && problem.problem.code === 'FORBIDDEN' && /csrf/i.test(problem.problem.title);
    if (csrfFailure) {
      await refreshCsrf();
      const retryHeaders = new Headers(init.headers);
      if (init.body && !(init.body instanceof FormData)) retryHeaders.set('Content-Type', 'application/json');
      if (csrfToken) retryHeaders.set('X-CSRF-Token', csrfToken);
      response = await fetch(url, { ...requestInit, headers: retryHeaders });
      if (!response.ok) throw await readProblem(response);
    } else {
      throw problem;
    }
  }
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json();
  return schema ? schema.parse(data) : data as T;
}

export function resetCsrf() { csrfToken = null; }
export function setCsrf(value: string | null) { csrfToken = value; }
