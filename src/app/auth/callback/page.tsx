import { OAuthResult } from '@/features/auth/ui/oauth-result';
export default async function AuthCallbackPage({ searchParams }: { searchParams: Promise<{ oauth?: string }> }) { return <OAuthResult result={(await searchParams).oauth} />; }
