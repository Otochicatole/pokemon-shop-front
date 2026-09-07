import { AuthForm } from '@/features/auth/ui/auth-form';
import { AuthShell } from '@/features/auth/ui/auth-shell';
import { Suspense } from 'react';
export default function LoginPage() { return <AuthShell eyebrow="Bienvenido de nuevo" title="Ingresá a tu cuenta"><Suspense><AuthForm mode="login" /></Suspense></AuthShell>; }
