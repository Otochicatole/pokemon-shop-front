import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminDataTable, Dialog, SwitchField } from '@/components';

describe('admin component primitives', () => {
  it('renders semantic tables and mobile labels', () => {
    render(<AdminDataTable caption="Productos" rows={[{ id: 'p1', name: 'Carta demo' }]} rowKey={(row) => row.id} columns={[{ key: 'name', header: 'Producto', render: (row) => row.name }]} />);
    expect(screen.getByRole('table', { name: 'Productos' })).toBeInTheDocument();
    expect(screen.getByText('Carta demo').closest('td')).toHaveAttribute('data-label', 'Producto');
  });

  it('exposes an accessible switch', () => {
    const change = vi.fn(); render(<SwitchField label="Producto activo" checked={false} onChange={change} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Producto activo' }));
    expect(change).toHaveBeenCalledWith(true);
  });

  it('closes dialogs with Escape and restores scroll state', () => {
    const close = vi.fn(); render(<Dialog open title="Confirmar acción" description="Descripción segura" onClose={close}><button type="button">Aceptar</button></Dialog>);
    expect(screen.getByRole('dialog', { name: 'Confirmar acción' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
  });
});
