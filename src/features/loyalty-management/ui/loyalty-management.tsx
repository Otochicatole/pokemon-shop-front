'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Gift, Percent, RefreshCw } from 'lucide-react';
import { toast } from '@/components/feedback';
import { AdminPageHeader, Button, MoneyField, SwitchField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminMoney } from '@/shared/admin/format';
import type { AdminLoyaltyProgram } from '../domain/contracts';
import { getAdminLoyaltyProgram, updateAdminLoyaltyProgram } from '../infrastructure/api';
import styles from './loyalty-management.module.css';
import shared from '@/components/admin/admin-shared.module.css';
import statStyles from '@/components/admin/AdminStatCard.module.css';
function decimalFromMinor(value: string) {
  const minor = BigInt(value);
  return `${minor / 100n}.${(minor % 100n).toString().padStart(2, '0')}`;
}
function minorFromDecimal(value: string) {
  if (!/^\d+(?:[.,]\d{0,2})?$/.test(value)) return null;
  const [whole = '0', decimals = ''] = value.replace(',', '.').split('.');
  return (BigInt(whole || '0') * 100n + BigInt((decimals + '00').slice(0, 2))).toString();
}

function LoyaltyEditor({ program }: { program: AdminLoyaltyProgram }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(program.enabled);
  const [spend, setSpend] = useState(decimalFromMinor(program.spendPerPoint.amountMinor));
  const [pointsPerStep, setPointsPerStep] = useState(String(program.pointsPerStep));
  const [pointValue, setPointValue] = useState(decimalFromMinor(program.pointValue.amountMinor));
  const [minimum, setMinimum] = useState(String(program.minimumRedemptionPoints));
  const [maximumPercent, setMaximumPercent] = useState(String(program.maximumRedemptionPercent));
  const spendMinor = minorFromDecimal(spend);
  const valueMinor = minorFromDecimal(pointValue);
  const parsedPoints = Number(pointsPerStep);
  const parsedMinimum = Number(minimum);
  const parsedMaximum = Number(maximumPercent);
  const valid = Boolean(spendMinor && BigInt(spendMinor) > 0n && valueMinor && BigInt(valueMinor) > 0n && Number.isInteger(parsedPoints) && parsedPoints >= 1 && parsedPoints <= 100 && Number.isInteger(parsedMinimum) && parsedMinimum >= 1 && Number.isInteger(parsedMaximum) && parsedMaximum >= 1 && parsedMaximum <= 90);
  const mutation = useMutation({
    mutationFn: () => updateAdminLoyaltyProgram({ enabled, spendPerPointMinor: spendMinor!, pointsPerStep: parsedPoints, pointValueMinor: valueMinor!, minimumRedemptionPoints: parsedMinimum, maximumRedemptionPercent: parsedMaximum, expectedVersion: program.version }),
    onSuccess: async (updated) => { queryClient.setQueryData(['admin', 'loyalty'], updated); await Promise.all([queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] }), queryClient.invalidateQueries({ queryKey: ['loyalty-program'] }), queryClient.invalidateQueries({ queryKey: ['loyalty-account'] })]); toast.success('Programa de puntos actualizado'); },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  return <>
    <div className={styles.adminLoyaltyStats}><div className={[statStyles.adminStatCard, statStyles.toneYellow].filter(Boolean).join(' ')}><span className={statStyles.adminStatLabel}><Coins size={15} /> Estado</span><strong>{enabled ? 'Activo' : 'Pausado'}</strong><small>El saldo existente nunca se elimina.</small></div><div className={[statStyles.adminStatCard, statStyles.toneCyan].filter(Boolean).join(' ')}><span className={statStyles.adminStatLabel}><Gift size={15} /> Acumulación</span><strong>{pointsPerStep || '—'} pt</strong><small>cada {spend || '—'} USD netos</small></div><div className={[statStyles.adminStatCard, statStyles.toneGreen].filter(Boolean).join(' ')}><span className={statStyles.adminStatLabel}><Percent size={15} /> Tope de canje</span><strong>{maximumPercent || '—'}%</strong><small>del subtotal de productos</small></div></div>
    <form className={shared.adminForm} onSubmit={(event) => { event.preventDefault(); if (valid) mutation.mutate(); }}><section className={shared.adminFormSection}><h2>Disponibilidad</h2><SwitchField label="Programa de puntos activo" description="Al pausarlo no se ganan ni se canjean puntos nuevos; los saldos se conservan." checked={enabled} onChange={setEnabled} disabled={mutation.isPending} /></section><section className={shared.adminFormSection}><h2>Regla de acumulación</h2><div className={shared.adminFormGrid}><MoneyField label="Compra necesaria" value={spend} min="0.01" onChange={(event) => setSpend(event.target.value)} /><TextField label="Puntos otorgados" type="number" min="1" max="100" step="1" inputMode="numeric" value={pointsPerStep} onChange={(event) => setPointsPerStep(event.target.value)} hint="Se acreditan al aprobarse el pago." /></div></section><section className={shared.adminFormSection}><h2>Regla de canje</h2><div className={shared.adminFormGrid}><MoneyField label="Descuento por punto" value={pointValue} min="0.01" onChange={(event) => setPointValue(event.target.value)} /><TextField label="Canje mínimo" type="number" min="1" step="1" inputMode="numeric" value={minimum} onChange={(event) => setMinimum(event.target.value)} /><TextField className={shared.adminFormSpan} label="Máximo de descuento (%)" type="number" min="1" max="90" step="1" inputMode="numeric" value={maximumPercent} onChange={(event) => setMaximumPercent(event.target.value)} hint="El descuento se aplica a productos, nunca al envío." /></div></section><section className={styles.adminLoyaltyPreview} aria-live="polite"><span>Así lo verá el cliente</span><p>Cada <strong>{spend || '—'} USD</strong> netos sumará <strong>{pointsPerStep || '—'} punto(s)</strong>. Cada punto descontará <strong>{pointValue || '—'} USD</strong>, desde {minimum || '—'} puntos y hasta el {maximumPercent || '—'}% del subtotal.</p></section><div className={shared.adminFormFooter}><span>Versión {program.version} · {adminMoney(program.spendPerPoint)} por paso</span><Button type="submit" disabled={!valid || mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar configuración'}</Button></div></form>
  </>;
}

export function LoyaltyManagementView() {
  const query = useQuery({ queryKey: ['admin', 'loyalty'], queryFn: getAdminLoyaltyProgram });
  return <><AdminPageHeader eyebrow="Beneficios" title="Programa de puntos" description="Definí cuánto suma cada compra y qué descuento obtiene el cliente. Las órdenes guardan una copia de la regla aplicada." actions={<Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />Actualizar</Button>} />{query.isLoading ? <div className={shared.adminLoading}>Cargando configuración</div> : query.isError || !query.data ? <div className={shared.adminErrorPanel}><div><h2>No pudimos cargar el programa</h2><p>{adminErrorMessage(query.error)}</p></div></div> : <LoyaltyEditor key={query.data.version} program={query.data} />}</>;
}
