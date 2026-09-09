import { AuthShell } from '@/features/auth/ui/auth-shell';
import { TokenForm } from '@/features/auth/ui/token-form';
import { Suspense } from 'react';
export default function ForgotPasswordPage() { return <AuthShell eyebrow="Recuperar acceso" title="¿Olvidaste tu contraseña?"><Suspense><TokenForm mode="forgot" /></Suspense></AuthShell>; }
