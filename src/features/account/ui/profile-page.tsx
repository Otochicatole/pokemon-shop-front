'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { getMe, updateProfile, type ProfileUpdateInput } from '@/features/auth/infrastructure/api';
import { publishSessionSync } from '@/shared/auth/session-sync';

export function ProfilePage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const [nameOverride, setNameOverride] = useState<{ userId: string; value: string }>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const name = query.data && nameOverride?.userId === query.data.id
    ? nameOverride.value
    : query.data?.name ?? '';
  const originalName = query.data?.name ?? '';
  const hasPasswordInput = Boolean(currentPassword || newPassword || confirmPassword);
  const hasChanges = Boolean(query.data && (name.trim() !== originalName || hasPasswordInput));

  const mutation = useMutation({
    mutationFn: () => {
      const payload: ProfileUpdateInput = {};
      if (name.trim() !== originalName) payload.name = name.trim() || null;
      if (newPassword || currentPassword || confirmPassword) {
        if (!newPassword) throw new Error('Ingresá una nueva contraseña');
        if (newPassword !== confirmPassword) throw new Error('Las contraseñas nuevas no coinciden');
        payload.currentPassword = currentPassword || undefined;
        payload.newPassword = newPassword;
        payload.confirmPassword = confirmPassword;
      }
      if (Object.keys(payload).length === 0) throw new Error('No hay cambios para guardar');
      return updateProfile(payload);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      setNameOverride({ userId: user.id, value: user.name ?? '' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      publishSessionSync('user', 'changed');
      toast.success('Perfil actualizado');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No pudimos actualizar tu perfil'),
  });

  if (query.isLoading) return <div className="page-loading">Cargando perfil…</div>;
  if (!query.data) {
    return <div className="empty-state"><h1>Tu perfil</h1><p>Ingresá para gestionar tus datos personales.</p><Link href="/auth/login?returnTo=/account/profile" className="button button-primary">Ingresar</Link></div>;
  }

  return (
    <section className="profile-page">
      <div className="profile-heading">
        <Link className="back-link" href="/account">← Volver a mi cuenta</Link>
        <div className="profile-title-row">
          <div>
            <p className="eyebrow">Cuenta personal</p>
            <h1>Mi perfil</h1>
            <p>Actualizá tus datos y mantené segura tu cuenta.</p>
          </div>
        </div>
      </div>

      <form className="profile-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <div className="profile-grid">
          <article className="profile-panel">
            <div className="profile-panel-title"><span className="profile-panel-icon">01</span><div><p className="profile-panel-kicker">Identidad</p><h2>Datos personales</h2></div></div>
            <p className="profile-panel-description">Este es el nombre que vamos a usar para comunicarnos con vos.</p>
            <label className="profile-field">
              Email
              <input className="profile-readonly" type="email" value={query.data.email} readOnly aria-describedby="profile-email-note" />
            </label>
            <small id="profile-email-note" className="profile-hint">El email de Google o de registro no se puede modificar.</small>
            <label className="profile-field">
              Nombre
              <input type="text" value={name} onChange={(event) => setNameOverride({ userId: query.data.id, value: event.target.value })} autoComplete="name" maxLength={100} placeholder="Tu nombre" />
            </label>
          </article>

          <article className="profile-panel">
            <div className="profile-panel-title"><span className="profile-panel-icon profile-panel-icon-security">02</span><div><p className="profile-panel-kicker">Seguridad</p><h2>Contraseña</h2></div></div>
            <p className="profile-panel-description">Usá al menos 12 caracteres. Si tu cuenta es solo de Google, podés dejar la contraseña actual vacía.</p>
            <label className="profile-field">
              Contraseña actual
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" placeholder="Tu contraseña actual" />
            </label>
            <label className="profile-field">
              Nueva contraseña
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} placeholder="12 caracteres o más" />
            </label>
            <label className="profile-field">
              Repetir contraseña
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} placeholder="Repetí la nueva contraseña" />
            </label>
          </article>
        </div>

        {mutation.error && <p className="profile-error" role="alert">{mutation.error instanceof Error ? mutation.error.message : 'No pudimos actualizar tu perfil'}</p>}
        <div className="profile-footer">
          <Link className="button button-ghost" href="/account">Cancelar</Link>
          <Button type="submit" disabled={mutation.isPending || !hasChanges}>{mutation.isPending ? 'Guardando…' : hasChanges ? 'Guardar cambios' : 'Sin cambios'}</Button>
        </div>
      </form>
    </section>
  );
}
