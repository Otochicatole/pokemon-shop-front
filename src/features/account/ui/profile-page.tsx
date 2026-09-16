'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Shield, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/feedback';
import { getMe, updateProfile, type ProfileUpdateInput } from '@/features/auth/infrastructure/api';
import { publishSessionSync } from '@/shared/auth/session-sync';
import styles from './profile-page.module.css';

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
    return (
      <EmptyState
        title="Tu perfil"
        description="Ingresá para gestionar tus datos personales."
        icon={<UserRound size={34} aria-hidden="true" />}
      >
        <Link href="/auth/login?returnTo=/account/profile" className="button button-primary">Ingresar</Link>
      </EmptyState>
    );
  }

  return (
    <section className={styles.profilePage}>
      <div className={styles.profileHeading}>
        <Link className={`back-link ${styles.backLink}`} href="/account">
          <ArrowLeft size={15} aria-hidden="true" />
          Volver a mi cuenta
        </Link>
        <div>
          <p className="eyebrow">Cuenta personal</p>
          <h1>Mi perfil</h1>
          <p>Actualizá tus datos y mantené segura tu cuenta.</p>
        </div>
      </div>

      <form className={styles.profileForm} onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <div className={styles.profileGrid}>
          <article className={styles.profilePanel}>
            <div className={styles.profilePanelTitle}>
              <span className={styles.profilePanelIcon} aria-hidden="true"><UserRound size={16} /></span>
              <div>
                <p className={styles.profilePanelKicker}>Identidad</p>
                <h2>Datos personales</h2>
              </div>
            </div>
            <p className={styles.profilePanelDescription}>Este es el nombre que vamos a usar para comunicarnos con vos.</p>
            <label className={styles.profileField}>
              Email
              <input className={styles.profileReadonly} type="email" value={query.data.email} readOnly aria-describedby="profile-email-note" />
            </label>
            <small id="profile-email-note" className={styles.profileHint}>El email de Google o de registro no se puede modificar.</small>
            <label className={styles.profileField}>
              Nombre
              <input type="text" value={name} onChange={(event) => setNameOverride({ userId: query.data.id, value: event.target.value })} autoComplete="name" maxLength={100} placeholder="Tu nombre" />
            </label>
          </article>

          <article className={styles.profilePanel}>
            <div className={styles.profilePanelTitle}>
              <span className={`${styles.profilePanelIcon} ${styles.profilePanelIconSecurity}`} aria-hidden="true"><Shield size={16} /></span>
              <div>
                <p className={styles.profilePanelKicker}>Seguridad</p>
                <h2>Contraseña</h2>
              </div>
            </div>
            <p className={styles.profilePanelDescription}>Usá al menos 12 caracteres. Si tu cuenta es solo de Google, podés dejar la contraseña actual vacía.</p>
            <label className={styles.profileField}>
              Contraseña actual
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" placeholder="Tu contraseña actual" />
            </label>
            <label className={styles.profileField}>
              Nueva contraseña
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} placeholder="12 caracteres o más" />
            </label>
            <label className={styles.profileField}>
              Repetir contraseña
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} placeholder="Repetí la nueva contraseña" />
            </label>
          </article>
        </div>

        {mutation.error && <p className={styles.profileError} role="alert">{mutation.error instanceof Error ? mutation.error.message : 'No pudimos actualizar tu perfil'}</p>}
        <div className={styles.profileFooter}>
          <Link className="button button-ghost" href="/account">Cancelar</Link>
          <Button type="submit" disabled={mutation.isPending || !hasChanges}>{mutation.isPending ? 'Guardando…' : hasChanges ? 'Guardar cambios' : 'Sin cambios'}</Button>
        </div>
      </form>
    </section>
  );
}
