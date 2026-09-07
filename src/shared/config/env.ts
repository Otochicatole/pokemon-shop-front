export const config = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME ?? 'Card Shop',
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:3000',
  apiBase: '/api/v1',
};
