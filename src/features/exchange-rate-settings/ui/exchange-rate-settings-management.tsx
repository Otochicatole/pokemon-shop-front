'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { AdminPageHeader, Button, SelectField } from '@/components';
import { adminErrorMessage } from '@/shared/admin/client';
import { adminDate } from '@/shared/admin/format';
import type { AdminExchangeRateSettings } from '../domain/contracts';
import { getAdminExchangeRateSettings, updateAdminExchangeRateSettings } from '../infrastructure/api';
import shared from '@/components/admin/admin-shared.module.css';

function ExchangeRateSettingsEditor({ settings }: { settings: AdminExchangeRateSettings }) {
  const queryClient = useQueryClient();
  const [casa, setCasa] = useState(settings.casa);
  const mutation = useMutation({
    mutationFn: () => updateAdminExchangeRateSettings({ casa, expectedVersion: settings.version }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(['admin', 'exchange-rate-settings'], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fx', 'usd-ars'] }),
        queryClient.invalidateQueries({ queryKey: ['checkout-options'] }),
      ]);
      toast.success('Tipo de dólar actualizado');
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });

  const refreshRatesOnOpen = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'exchange-rate-settings'] });
  };

  return (
    <form
      className={shared.adminForm}
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <section className={shared.adminFormSection}>
        <h2>Cotización para tienda y Mercado Pago</h2>
        <p className="form-hint">
          El catálogo y el cobro con Mercado Pago usan la cotización de venta de dolarapi según el tipo elegido. Admin y afiliados siguen cargando precios en USD.
        </p>
        <SelectField
          label="Tipo de dólar"
          value={casa}
          onChange={(event) => setCasa(event.target.value as AdminExchangeRateSettings['casa'])}
          onFocus={refreshRatesOnOpen}
          disabled={mutation.isPending}
        >
          {settings.availableCasas.map((option) => (
            <option key={option.value} value={option.value}>
              {option.rate ? `${option.label} — $ ${option.rate}` : option.label}
            </option>
          ))}
        </SelectField>
        <p className="form-hint">Al abrir el listado se actualizan las cotizaciones de venta de cada tipo.</p>
      </section>

      <section className={shared.adminFormSection}>
        <h2>Cotización actual</h2>
        {settings.currentRate ? (
          <dl className={shared.adminDefinitionList}>
            <dt>Venta</dt>
            <dd><strong>$ {settings.currentRate.rate}</strong> ARS por USD</dd>
            <dt>Fuente</dt>
            <dd>{settings.currentRate.source}</dd>
            <dt>Obtenida</dt>
            <dd>{adminDate(settings.currentRate.fetchedAt, true)}</dd>
            <dt>Vigente hasta</dt>
            <dd>{adminDate(settings.currentRate.expiresAt, true)}</dd>
          </dl>
        ) : (
          <p className="form-hint">No pudimos obtener la cotización ahora. Revisá la conexión con dolarapi.</p>
        )}
      </section>

      <div className={shared.adminFormFooter}>
        <span>Versión {settings.version}</span>
        <Button type="submit" disabled={mutation.isPending || casa === settings.casa}>
          <DollarSign size={16} />
          {mutation.isPending ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </div>
    </form>
  );
}

export function ExchangeRateSettingsManagementView() {
  const query = useQuery({ queryKey: ['admin', 'exchange-rate-settings'], queryFn: getAdminExchangeRateSettings });
  return (
    <>
      <AdminPageHeader
        eyebrow="Configuración"
        title="Tipo de dólar"
        description="Elegí qué cotización de dolarapi se usa para mostrar precios en ARS y para convertir pagos de Mercado Pago."
        actions={(
          <Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCw size={16} />
            Actualizar
          </Button>
        )}
      />
      {query.isLoading ? (
        <div className={shared.adminLoading}>Cargando configuración</div>
      ) : query.isError || !query.data ? (
        <div className={shared.adminErrorPanel}>
          <div>
            <h2>No pudimos cargar la configuración de cotización</h2>
            <p>{adminErrorMessage(query.error)}</p>
            <Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button>
          </div>
        </div>
      ) : (
        <ExchangeRateSettingsEditor key={query.data.version} settings={query.data} />
      )}
    </>
  );
}
