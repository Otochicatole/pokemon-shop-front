import { AuthShell } from '@/features/auth/ui/auth-shell';
import { TokenForm } from '@/features/auth/ui/token-form';
import { Suspense } from 'react';
export default function VerifyEmailPage() { return <AuthShell eyebrow="Un último paso" title="Verificá tu email"><Suspense><TokenForm mode="verify" /></Suspense></AuthShell>; }
