import { OAuthResult } from '@/features/auth/ui/oauth-result';
import styles from './page.module.css';
export default async function AuthCallbackPage({ searchParams }: { searchParams: Promise<{ oauth?: string }> }) { return <OAuthResult result={(await searchParams).oauth} />; }
