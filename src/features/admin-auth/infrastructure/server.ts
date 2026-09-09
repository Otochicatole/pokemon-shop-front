import 'server-only';

import { cookies } from 'next/headers';
import { config } from '@/shared/config/env';
import { adminSessionEnvelopeSchema, type AdminIdentity } from '../domain/contracts';

export async function getAdminServerSession(): Promise<AdminIdentity | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  if (!cookieHeader) return null;
  try {
    const response = await fetch(`${config.backendUrl}${config.apiBase}/admin/auth/me`, {
      headers: { Cookie: cookieHeader, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const parsed = adminSessionEnvelopeSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.data.admin : null;
  } catch {
    return null;
  }
}
