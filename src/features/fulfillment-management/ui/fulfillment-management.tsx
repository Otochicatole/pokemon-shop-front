'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, RefreshCw, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { AdminPageHeader, AdminTabPanel, AdminTabs, Button, ConfirmDialog, Dialog, MoneyField, SwitchField, TextareaField, TextField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminMoney } from '@/shared/admin/format';
import type { PickupPoint, ShippingZone } from '../domain/contracts';
import {
  deletePickupPoint,
  deleteShippingZone,
  getFulfillmentConfiguration,
  savePickupPoint,
  saveShippingZone,
  setPickupPointActive,
  setShippingZoneActive,
} from '../infrastructure/api';
import styles from './fulfillment-management.module.css';
import shared from '@/components/admin/admin-shared.module.css';

function minorFromDecimal(value: string) {
  const [whole = '0', decimals = ''] = value.replace(',', '.').split('.');
  return (BigInt(whole || '0') * 100n + BigInt((decimals + '00').slice(0, 2))).toString();
}

function decimalFromMinor(value: string) {
  return (Number(BigInt(value)) / 100).toFixed(2);
}

type RateDraft = { id?: string; name: string; price: string; active: boolean };
type PendingDelete =
  | { type: 'zone'; item: ShippingZone }
  | { type: 'point'; item: PickupPoint }
  | null;

function ZoneEditor({ zone, onClose }: { zone: ShippingZone | null | undefined; onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState(zone?.name ?? '');
  const [active, setActive] = useState(zone?.active ?? true);
  const [provinces, setProvinces] = useState(zone?.provinces.join('\n') ?? '');
  const [rates, setRates] = useState<RateDraft[]>(
    zone?.rates.map((rate) => ({ id: rate.id, name: rate.name, price: decimalFromMinor(rate.price.amountMinor), active: rate.active }))
    ?? [{ name: 'Envío estándar', price: '0.00', active: true }],
  );
  const mutation = useMutation({
    mutationFn: () => saveShippingZone(zone?.id, {
      name: name.trim(),
      active,
      provinces: provinces.split(/[,\n]/).map((item) => item.trim()).filter(Boolean),
      rates: rates.map((rate) => ({
        ...(rate.id ? { id: rate.id } : {}),
        name: rate.name.trim(),
        priceMinor: minorFromDecimal(rate.price),
        active: rate.active,
      })),
    }),
    onSuccess: async () => {
      toast.success(zone ? 'Zona actualizada' : 'Zona creada');
      await client.invalidateQueries({ queryKey: ['admin', 'fulfillment'] });
      onClose();
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const valid = name.trim() && provinces.trim() && rates.length > 0 && rates.every((rate) => rate.name.trim() && /^\d+(?:[.,]\d{1,2})?$/.test(rate.price));

  return (
    <div className={shared.adminDialogForm}>
      <TextField label="Nombre de zona" value={name} onChange={(event) => setName(event.target.value)} />
      <TextareaField
        label="Provincias"
        hint="Una provincia por línea o separadas por coma. Una provincia no puede pertenecer a dos zonas activas."
        value={provinces}
        onChange={(event) => setProvinces(event.target.value)}
      />
      <SwitchField label="Zona activa" checked={active} onChange={setActive} />
      <div className={styles.adminRateList}>
        <div className={shared.adminPanelHeader}>
          <h3>Tarifas</h3>
          <button type="button" onClick={() => setRates((items) => [...items, { name: '', price: '0.00', active: true }])}>+ Agregar</button>
        </div>
        {rates.map((rate, index) => (
          <div className={styles.adminRateRow} key={rate.id ?? index}>
            <TextField
              label={`Tarifa ${index + 1}`}
              value={rate.name}
              onChange={(event) => setRates((items) => items.map((item, position) => position === index ? { ...item, name: event.target.value } : item))}
            />
            <MoneyField
              label="Precio"
              value={rate.price}
              onChange={(event) => setRates((items) => items.map((item, position) => position === index ? { ...item, price: event.target.value } : item))}
            />
            <SwitchField
              label="Activa"
              checked={rate.active}
              onChange={(checked) => setRates((items) => items.map((item, position) => position === index ? { ...item, active: checked } : item))}
            />
            {rates.length > 1 && (
              <button type="button" className={styles.adminTextDanger} onClick={() => setRates((items) => items.filter((_, position) => position !== index))}>
                Retirar
              </button>
            )}
          </div>
        ))}
      </div>
      <div className={shared.adminDialogActions}>
        <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Volver</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !valid}>
          {mutation.isPending ? 'Guardando…' : 'Guardar zona'}
        </Button>
      </div>
    </div>
  );
}

function PickupEditor({ point, onClose }: { point: PickupPoint | null | undefined; onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState(point?.name ?? '');
  const [address, setAddress] = useState(point?.address ?? '');
  const [active, setActive] = useState(point?.active ?? true);
  const mutation = useMutation({
    mutationFn: () => savePickupPoint(point?.id, { name: name.trim(), address: address.trim(), active }),
    onSuccess: async () => {
      toast.success(point ? 'Punto actualizado' : 'Punto creado');
      await client.invalidateQueries({ queryKey: ['admin', 'fulfillment'] });
      onClose();
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });

  return (
    <div className={shared.adminDialogForm}>
      <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
      <TextareaField label="Dirección completa" value={address} onChange={(event) => setAddress(event.target.value)} />
      <SwitchField label="Disponible para retiro" checked={active} onChange={setActive} />
      <div className={shared.adminDialogActions}>
        <Button variant="secondary" onClick={onClose}>Volver</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim() || !address.trim()}>
          Guardar punto
        </Button>
      </div>
    </div>
  );
}

export function FulfillmentManagementView() {
  const client = useQueryClient();
  const [tab, setTab] = useState('shipping');
  const [zoneEditor, setZoneEditor] = useState<ShippingZone | null | undefined>();
  const [pointEditor, setPointEditor] = useState<PickupPoint | null | undefined>();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const query = useQuery({ queryKey: ['admin', 'fulfillment'], queryFn: getFulfillmentConfiguration });
  const zoneActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setShippingZoneActive(id, active),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin', 'fulfillment'] });
      toast.success('Estado actualizado');
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const pointActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setPickupPointActive(id, active),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin', 'fulfillment'] });
      toast.success('Estado actualizado');
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: () => {
      if (!pendingDelete) return Promise.resolve();
      return pendingDelete.type === 'zone'
        ? deleteShippingZone(pendingDelete.item.id)
        : deletePickupPoint(pendingDelete.item.id);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin', 'fulfillment'] });
      toast.success(pendingDelete?.type === 'zone' ? 'Zona eliminada' : 'Punto de retiro eliminado');
      setPendingDelete(null);
    },
    onError: (error) => {
      toast.error(adminErrorMessage(error));
      setPendingDelete(null);
    },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Logística"
        title="Envíos y retiro"
        description="Administrá zonas de envío y puntos de retiro. Las órdenes históricas conservan los datos ya guardados."
        actions={(
          <Button variant="secondary" onClick={() => void query.refetch()}>
            <RefreshCw size={16} />
            Actualizar
          </Button>
        )}
      />
      <AdminTabs
        id="fulfillment-tabs"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'shipping', label: 'Zonas de envío', count: query.data?.shippingZones.length },
          { id: 'pickup', label: 'Puntos de retiro', count: query.data?.pickupPoints.length },
        ]}
      />
      <AdminTabPanel tabsId="fulfillment-tabs" tabId={tab} active>
        {query.isLoading ? (
          <div className={shared.adminLoading}>Cargando configuración</div>
        ) : query.isError ? (
          <div className={shared.adminErrorPanel}>
            <div>
              <h2>No pudimos cargar fulfillment</h2>
              <p>{adminErrorMessage(query.error)}</p>
            </div>
          </div>
        ) : tab === 'shipping' ? (
          <div className={styles.adminCardSection}>
            <div className={styles.adminSectionActions}>
              <Button onClick={() => setZoneEditor(null)}><Plus size={16} />Nueva zona</Button>
            </div>
            <div className={styles.adminConfigGrid}>
              {query.data?.shippingZones.map((zone) => (
                <article className={styles.adminConfigCard} key={zone.id}>
                  <header>
                    <div className={styles.adminCardLead}>
                      <span className={styles.adminConfigIcon}><Truck size={20} /></span>
                      <div>
                        <h2>{zone.name}</h2>
                        <small>{zone.provinces.length} provincia(s)</small>
                      </div>
                    </div>
                    <div className={styles.adminCardActions}>
                      <button className={shared.adminIconButton} type="button" onClick={() => setZoneEditor(zone)} aria-label={`Editar ${zone.name}`}>
                        <Pencil size={16} />
                      </button>
                      <button className={`${shared.adminIconButton} ${styles.adminDeleteButton}`} type="button" onClick={() => setPendingDelete({ type: 'zone', item: zone })} aria-label={`Eliminar ${zone.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </header>
                  <p>{zone.provinces.join(' · ')}</p>
                  <ul>
                    {zone.rates.map((rate) => (
                      <li key={rate.id}>
                        <span>{rate.name}{!rate.active && ' (inactiva)'}</span>
                        <strong>{adminMoney(rate.price)}</strong>
                      </li>
                    ))}
                  </ul>
                  <SwitchField
                    label={zone.active ? 'Zona activa' : 'Zona inactiva'}
                    checked={zone.active}
                    disabled={zoneActive.isPending}
                    onChange={(active) => zoneActive.mutate({ id: zone.id, active })}
                  />
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.adminCardSection}>
            <div className={styles.adminSectionActions}>
              <Button onClick={() => setPointEditor(null)}><Plus size={16} />Nuevo punto</Button>
            </div>
            <div className={styles.adminConfigGrid}>
              {query.data?.pickupPoints.map((point) => (
                <article className={styles.adminConfigCard} key={point.id}>
                  <header>
                    <div className={styles.adminCardLead}>
                      <span className={styles.adminConfigIcon}><MapPin size={20} /></span>
                      <div>
                        <h2>{point.name}</h2>
                        <small>Retiro en tienda</small>
                      </div>
                    </div>
                    <div className={styles.adminCardActions}>
                      <button className={shared.adminIconButton} type="button" onClick={() => setPointEditor(point)} aria-label={`Editar ${point.name}`}>
                        <Pencil size={16} />
                      </button>
                      <button className={`${shared.adminIconButton} ${styles.adminDeleteButton}`} type="button" onClick={() => setPendingDelete({ type: 'point', item: point })} aria-label={`Eliminar ${point.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </header>
                  <p>{point.address}</p>
                  <SwitchField
                    label={point.active ? 'Disponible' : 'No disponible'}
                    checked={point.active}
                    disabled={pointActive.isPending}
                    onChange={(active) => pointActive.mutate({ id: point.id, active })}
                  />
                </article>
              ))}
            </div>
          </div>
        )}
      </AdminTabPanel>
      <Dialog
        open={zoneEditor !== undefined}
        onClose={() => setZoneEditor(undefined)}
        title={zoneEditor ? 'Editar zona de envío' : 'Nueva zona de envío'}
        className={shared.adminWideDialog}
      >
        {zoneEditor !== undefined && <ZoneEditor zone={zoneEditor} onClose={() => setZoneEditor(undefined)} />}
      </Dialog>
      <Dialog
        open={pointEditor !== undefined}
        onClose={() => setPointEditor(undefined)}
        title={pointEditor ? 'Editar punto de retiro' : 'Nuevo punto de retiro'}
        className={shared.adminConfirmDialog}
      >
        {pointEditor !== undefined && <PickupEditor point={pointEditor} onClose={() => setPointEditor(undefined)} />}
      </Dialog>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.type === 'zone' ? 'Eliminar zona de envío' : 'Eliminar punto de retiro'}
        description={
          pendingDelete?.type === 'zone'
            ? `Se eliminará “${pendingDelete.item.name}” y sus tarifas. Las órdenes históricas conservan los datos ya guardados.`
            : `Se eliminará “${pendingDelete?.item.name ?? ''}”. Las órdenes históricas conservan los datos ya guardados.`
        }
        confirmLabel="Eliminar"
        danger
        busy={remove.isPending}
        onClose={() => !remove.isPending && setPendingDelete(null)}
        onConfirm={() => void remove.mutateAsync()}
      />
    </>
  );
}
