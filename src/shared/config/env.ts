const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const config = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME ?? 'Nevadatcg',
  siteUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nevadatcg.store'),
  // Server-side / Next rewrite target (can be internal).
  backendUrl: trimTrailingSlash(process.env.BACKEND_URL ?? 'http://localhost:3000'),
  // Browser-facing API origin for the storefront (Google OAuth + user cookies).
  // Admin stays on same-origin rewrites so SSR can read session cookies.
  publicApiUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL ?? ''),
  apiBase: '/api/v2',
};

export const siteDescription =
  'Tienda de cartas Pokémon, productos sellados y accesorios. Stock real, envíos a todo el país y compra protegida.';

/** Store/user API URL (browser → public API when configured). */
export function apiRequestUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const apiPath = `${config.apiBase}${normalized}`;
  if (typeof window === 'undefined') return `${config.backendUrl}${apiPath}`;
  return config.publicApiUrl ? `${config.publicApiUrl}${apiPath}` : apiPath;
}

/**
 * Admin API URL. Always same-origin in the browser so Set-Cookie lands on the
 * store host and getAdminServerSession can forward it on SSR navigations.
 */
export function adminApiRequestUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const apiPath = `${config.apiBase}${normalized}`;
  if (typeof window === 'undefined') return `${config.backendUrl}${apiPath}`;
  return apiPath;
}

export function googleAuthUrl() {
  return apiRequestUrl('/auth/google');
}

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${config.siteUrl}${normalized === '/' ? '' : normalized}`;
}
