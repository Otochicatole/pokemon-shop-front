import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/components/overlay/Dialog';

function PriceDialog({ expanded = false }: { expanded?: boolean }) {
  return <>
    <Dialog open title="Buscar precio de venta" onClose={vi.fn()}>
      <input aria-label="Buscar carta" data-dialog-autofocus />
      <button type="button">Ver historial</button>
      <details open={expanded}>
        <summary>Ver todos los precios</summary>
        <button type="button">Usar precio USD</button>
      </details>
      <div hidden><button type="button">Oculto</button></div>
      <div inert><button type="button">Inerte</button></div>
      <div aria-hidden="true"><button type="button">No accesible</button></div>
      <div style={{ display: 'none' }}><button type="button">No mostrado</button></div>
      <button type="button" style={{ visibility: 'hidden' }}>Invisible</button>
      <button type="button" tabIndex={-1}>Fuera del orden de tabulación</button>
      <fieldset disabled><button type="button">Deshabilitado por grupo</button></fieldset>
    </Dialog>
    <input aria-label="Formulario de fondo" />
  </>;
}

describe('dialog focus containment', () => {
  it('wraps both directions at the visible summary while price actions are collapsed', async () => {
    const user = userEvent.setup();
    render(<PriceDialog />);
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Buscar carta' })).toHaveFocus());
    const close = screen.getByRole('button', { name: 'Cerrar' });
    const summary = screen.getByText('Ver todos los precios');

    close.focus();
    await user.tab({ shift: true });
    expect(summary).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Formulario de fondo' })).not.toHaveFocus();
  });

  it('includes the price action when the disclosure opens and excludes it again after collapse', async () => {
    const user = userEvent.setup();
    render(<PriceDialog />);
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Buscar carta' })).toHaveFocus());
    const close = screen.getByRole('button', { name: 'Cerrar' });
    const summary = screen.getByText('Ver todos los precios');
    await user.click(summary);
    const apply = screen.getByRole('button', { name: 'Usar precio USD' });

    close.focus();
    await user.tab({ shift: true });
    expect(apply).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.click(summary);
    close.focus();
    await user.tab({ shift: true });
    expect(summary).toHaveFocus();
  });
});
