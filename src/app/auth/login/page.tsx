import { AuthForm } from '@/features/auth/ui/auth-form';
import { AuthShell } from '@/features/auth/ui/auth-shell';
import { LegendaryBattle } from '@/features/auth';
import { Suspense } from 'react';
export default function LoginPage() { return <AuthShell eyebrow="Bienvenido de nuevo" title="Ingresá a tu cuenta" asideContent={<LegendaryBattle />}><Suspense><AuthForm mode="login" /></Suspense></AuthShell>; }
