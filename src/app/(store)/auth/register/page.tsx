import { AuthForm } from '@/features/auth/ui/auth-form';
import { AuthShell } from '@/features/auth/ui/auth-shell';
import { Suspense } from 'react';
export default function RegisterPage() { return <AuthShell eyebrow="Empezá tu colección" title="Crear una cuenta"><Suspense><AuthForm mode="register" /></Suspense></AuthShell>; }
