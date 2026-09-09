'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PrimaryButton, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminLoginSchema, type AdminLoginInput } from '../domain/contracts';
import { loginAdmin } from '../infrastructure/api';

function safeReturnTo(value?: string) {
  return value?.startsWith('/admin') && !value.startsWith('//') ? value : '/admin';
}

export function AdminLoginForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const form = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema), defaultValues: { email: '', password: '' } });
  const submit = form.handleSubmit(async (values) => {
    try {
      await loginAdmin(values);
      toast.success('Sesión administrativa iniciada');
      router.replace(safeReturnTo(returnTo));
      router.refresh();
    } catch (error) {
      form.setError('root', { message: adminErrorMessage(error) });
    }
  });
  return <section className="admin-login-card"><span className="admin-eyebrow"><ShieldCheck size={14} /> Acceso protegido</span><h2>Ingresá al CMS</h2><form onSubmit={submit} noValidate><TextField label="Email" type="email" autoComplete="username" placeholder="admin@cardshop.test" error={form.formState.errors.email?.message} {...form.register('email')} /><TextField label="Contraseña" type="password" autoComplete="current-password" error={form.formState.errors.password?.message} {...form.register('password')} />{form.formState.errors.root?.message && <div className="admin-notice is-danger" role="alert">{form.formState.errors.root.message}</div>}<PrimaryButton type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}</PrimaryButton></form><footer>Las cuentas administrativas se crean únicamente desde la consola segura del backend.</footer></section>;
}
