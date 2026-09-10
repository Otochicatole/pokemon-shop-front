import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { TransferSettingsManagementView } from '@/features/transfer-settings';
import { getAdminTransferSettings, updateAdminTransferSettings } from '@/features/transfer-settings/infrastructure/api';

vi.mock('@/features/transfer-settings/infrastructure/api', () => ({
  getAdminTransferSettings: vi.fn(),
  updateAdminTransferSettings: vi.fn(),
}));

const settings = {
  enabled: false,
  bankName: '',
  accountHolder: '',
  cbu: null,
  alias: null,
  version: 1,
  updatedAt: '2026-09-10T12:00:00.000Z',
  currency: 'USD' as const,
};

function renderView() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><TransferSettingsManagementView /></QueryClientProvider>);
}

describe('transfer settings management', () => {
  it('exposes labeled, accessible controls and submits the configuration', async () => {
    vi.mocked(getAdminTransferSettings).mockResolvedValue(settings);
    vi.mocked(updateAdminTransferSettings).mockResolvedValue({ ...settings, enabled: true, bankName: 'Banco Demo', accountHolder: 'Card Shop', cbu: '1234567890123456789012', version: 2 });
    renderView();

    expect(await screen.findByRole('switch', { name: 'Aceptar transferencias bancarias' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('Banco')).toBeInTheDocument();
    expect(screen.getByLabelText('Titular de la cuenta')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /CBU/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Alias')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Banco'), { target: { value: 'Banco Demo' } });
    fireEvent.change(screen.getByLabelText('Titular de la cuenta'), { target: { value: 'Card Shop' } });
    fireEvent.change(screen.getByRole('textbox', { name: /CBU/ }), { target: { value: '1234567890123456789012' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Aceptar transferencias bancarias' }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar configuración/i }));

    await waitFor(() => expect(updateAdminTransferSettings).toHaveBeenCalledWith(expect.objectContaining({
      enabled: true, bankName: 'Banco Demo', accountHolder: 'Card Shop', cbu: '1234567890123456789012', alias: null, expectedVersion: 1,
    })));
  });
});
