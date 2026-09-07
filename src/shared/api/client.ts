import { config } from '@/shared/config/env';
import { problemSchema } from './contracts';

export class ApiError extends Error {
  constructor(public readonly problem: { code: string; status: number; title: string; details?: unknown }) { super(problem.title); }
}

let csrfToken: string | null = null;

async function readProblem(response: Response): Promise<ApiError> {
  const parsed = problemSchema.safeParse(await response.json().catch(() => ({ code: 'NETWORK_ERROR', status: response.status, title: 'No se pudo conectar' })));
  return new ApiError(parsed.success ? parsed.data : { code: 'HTTP_ERROR', status: response.status, title: 'No se pudo completar la solicitud' });
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, schema?: { parse: (value: unknown) => T }): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    if (!csrfToken) {
      const csrf = await fetch(`${config.apiBase}/auth/csrf`, { credentials: 'include', cache: 'no-store' });
      csrfToken = (await csrf.json()).csrfToken ?? null;
    }
  }
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (csrfToken && method !== 'GET' && method !== 'HEAD') headers.set('X-CSRF-Token', csrfToken);
  const base = typeof window === 'undefined' ? config.backendUrl : '';
  const response = await fetch(path.startsWith('http') ? path : `${base}${config.apiBase}${path}`, { ...init, headers, credentials: 'include', ...(typeof window === 'undefined' ? { next: { revalidate: 15 } } : {}) } as RequestInit);
  if (!response.ok) throw await readProblem(response);
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json();
  return schema ? schema.parse(data) : data as T;
}

export function resetCsrf() { csrfToken = null; }
export function setCsrf(value: string | null) { csrfToken = value; }
