const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const config = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME ?? 'Card Shop',
  // Server-side / Next rewrite target (can be internal).
  backendUrl: trimTrailingSlash(process.env.BACKEND_URL ?? 'http://localhost:3000'),
  // Browser-facing API origin. When set (e.g. https://api.nevadatcg.store),
  // auth cookies are sent to that host — required if Google OAuth redirects there.
  // Leave empty locally to use the same-origin Next rewrite.
  publicApiUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL ?? ''),
  apiBase: '/api/v2',
};

/** Absolute or same-origin URL for a store/admin API path (includes /api/v2). */
export function apiRequestUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const apiPath = `${config.apiBase}${normalized}`;
  if (typeof window === 'undefined') return `${config.backendUrl}${apiPath}`;
  return config.publicApiUrl ? `${config.publicApiUrl}${apiPath}` : apiPath;
}

export function googleAuthUrl() {
  return apiRequestUrl('/auth/google');
}
