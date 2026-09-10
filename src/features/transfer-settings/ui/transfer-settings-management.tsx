'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminPageHeader, Button, SwitchField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import type { AdminTransferSettings } from '../domain/contracts';
import { getAdminTransferSettings, updateAdminTransferSettings } from '../infrastructure/api';

function TransferSettingsEditor({ settings }: { settings: AdminTransferSettings }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [bankName, setBankName] = useState(settings.bankName);
  const [accountHolder, setAccountHolder] = useState(settings.accountHolder);
  const [cbu, setCbu] = useState(settings.cbu ?? '');
  const [alias, setAlias] = useState(settings.alias ?? '');
  const complete = Boolean(bankName.trim() && accountHolder.trim() && (cbu.trim() || alias.trim()));
  const valid = !enabled || complete;
  const mutation = useMutation({
    mutationFn: () => updateAdminTransferSettings({
      enabled,
      bankName: bankName.trim(),
      accountHolder: accountHolder.trim(),
      cbu: cbu.trim() || null,
      alias: alias.trim() || null,
      expectedVersion: settings.version,
    }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(['admin', 'transfer-settings'], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['checkout-options'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
      toast.success('Datos de transferencia actualizados');
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });

  return <form className="admin-form" onSubmit={(event) => { event.preventDefault(); if (valid) mutation.mutate(); }}>
    <section className="admin-form-section">
      <h2>Disponibilidad</h2>
      <SwitchField label="Aceptar transferencias bancarias" description="Si está desactivado, no aparecerá como medio de pago en el checkout." checked={enabled} onChange={setEnabled} disabled={mutation.isPending} />
      {!complete && <p className="form-hint">Para activar la transferencia completá banco, titular y al menos CBU o alias.</p>}
    </section>
    <section className="admin-form-section">
      <h2>Datos de la cuenta</h2>
      <div className="admin-form-grid">
        <TextField label="Banco" value={bankName} maxLength={120} onChange={(event) => setBankName(event.target.value)} disabled={mutation.isPending} />
        <TextField label="Titular de la cuenta" value={accountHolder} maxLength={120} onChange={(event) => setAccountHolder(event.target.value)} disabled={mutation.isPending} />
        <TextField label="CBU" value={cbu} maxLength={100} inputMode="numeric" onChange={(event) => setCbu(event.target.value)} disabled={mutation.isPending} hint="Podés completar CBU, alias o ambos." />
        <TextField label="Alias" value={alias} maxLength={100} onChange={(event) => setAlias(event.target.value)} disabled={mutation.isPending} />
      </div>
    </section>
    <section className="admin-loyalty-preview" aria-live="polite">
      <span>Vista previa para el cliente</span>
      {complete ? <div className="bank-details"><strong>Datos para transferir</strong><span>{bankName.trim()}</span><span>{accountHolder.trim()}</span>{cbu.trim() && <span>CBU: {cbu.trim()}</span>}{alias.trim() && <span>Alias: {alias.trim()}</span>}</div> : <p>Completá los datos de la cuenta para ver la vista previa.</p>}
    </section>
    <div className="admin-form-footer"><span>Versión {settings.version} · {enabled && complete ? 'Transferencia activa' : 'Transferencia inactiva'}</span><Button type="submit" disabled={!valid || mutation.isPending}><Banknote size={16} />{mutation.isPending ? 'Guardando…' : 'Guardar configuración'}</Button></div>
  </form>;
}

export function TransferSettingsManagementView() {
  const query = useQuery({ queryKey: ['admin', 'transfer-settings'], queryFn: getAdminTransferSettings });
  return <>
    <AdminPageHeader eyebrow="Configuración" title="Datos de transferencia" description="Definí la cuenta que recibirán los clientes que elijan pagar por transferencia bancaria." actions={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>} />
    {query.isLoading ? <div className="admin-loading">Cargando configuración</div> : query.isError || !query.data ? <div className="admin-error-panel"><div><h2>No pudimos cargar los datos de transferencia</h2><p>{adminErrorMessage(query.error)}</p><Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button></div></div> : <TransferSettingsEditor key={query.data.version} settings={query.data} />}
  </>;
}
