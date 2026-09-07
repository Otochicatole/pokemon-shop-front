import { apiFetch, resetCsrf, setCsrf } from '@/shared/api/client';
import { userSchema, type User } from '@/shared/api/contracts';
export async function login(email: string, password: string): Promise<User> { const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }) as { user: unknown; csrfToken?: string }; setCsrf(data.csrfToken ?? null); return userSchema.parse(data.user); }
export async function register(email: string, password: string, name?: string) { return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }) as Promise<{ user: User; verificationRequired: boolean }>; }
export async function getMe() { const data = await apiFetch('/auth/me') as { user: unknown }; return userSchema.parse(data.user); }
export async function logout() { await apiFetch('/auth/logout', { method: 'POST' }); resetCsrf(); }
export async function verifyEmail(token: string) { return apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }); }
export async function forgotPassword(email: string) { return apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); }
export async function resetPassword(token: string, password: string) { return apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }); }
