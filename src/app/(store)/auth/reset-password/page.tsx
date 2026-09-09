import { AuthShell } from '@/features/auth/ui/auth-shell';
import { TokenForm } from '@/features/auth/ui/token-form';
import { Suspense } from 'react';
export default function ResetPasswordPage() { return <AuthShell eyebrow="Recuperar acceso" title="Elegí una nueva contraseña"><Suspense><TokenForm mode="reset" /></Suspense></AuthShell>; }
