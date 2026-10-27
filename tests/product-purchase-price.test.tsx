import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductPurchasePrice } from '@/app/(store)/products/[slug]/product-purchase-price';
import { ProductPrice } from '@/components/product/ProductPrice';
import { StorefrontMoney } from '@/shared/fx/StorefrontMoney';
import type { Money } from '@/shared/api/contracts';

const fx = vi.hoisted(() => ({ formatMoney: vi.fn(), isLoading: false }));
vi.mock('@/shared/fx/StorefrontFxProvider', () => ({ useStorefrontFx: () => fx }));

const price: Money = { amountMinor: '1196', currency: 'USD' };

beforeEach(() => {
  fx.formatMoney.mockReset();
  fx.isLoading = false;
});

describe('catalog and cart currency fallbacks', () => {
  it('keeps the source currency visible when a conversion is unavailable', () => {
    fx.formatMoney.mockReturnValue('—');
    render(<><ProductPrice price={price} /><StorefrontMoney money={price} /></>);
    expect(screen.getAllByText(/11,96.*USD/)).toHaveLength(2);
    expect(screen.queryByText(/ARS/)).not.toBeInTheDocument();
    expect(screen.queryByText('Consultar precio')).not.toBeInTheDocument();
  });

  it('uses the converted amount once FX is available and never converts provider ARS twice', () => {
    fx.formatMoney.mockReturnValue('$ 15.428,40');
    render(<><ProductPrice price={price} /><StorefrontMoney money={{ amountMinor: '250000', currency: 'ARS' }} raw /></>);
    expect(screen.getByText('$ 15.428,40 ARS')).toBeInTheDocument();
    expect(screen.getByText(/2.500,00/)).toBeInTheDocument();
    expect(fx.formatMoney).toHaveBeenCalledTimes(1);
  });
});
afterEach(cleanup);

describe('public product purchase price', () => {
  it('shows the peso conversion and retains the original USD unit price', () => {
    fx.formatMoney.mockReturnValue('$ 15.428,40');
    render(<ProductPurchasePrice price={price} />);

    expect(fx.formatMoney).toHaveBeenCalledWith(price);
    expect(screen.getByText('$ 15.428,40')).toBeInTheDocument();
    expect(screen.getByText('ARS')).toBeInTheDocument();
    expect(screen.getByText(/Precio base:.*11,96 USD/)).toBeInTheDocument();
    expect(screen.getByText(/El total se confirma al finalizar la compra/)).toBeInTheDocument();
  });

  it.each([
    { loading: true, message: 'Calculando el equivalente en pesos…' },
    { loading: false, message: 'El equivalente en pesos no está disponible por el momento. Se muestra el precio base en USD.' },
  ])('keeps the USD price visible when conversion is unavailable (loading: $loading)', ({ loading, message }) => {
    fx.formatMoney.mockReturnValue('—');
    fx.isLoading = loading;
    render(<ProductPurchasePrice price={price} />);

    expect(screen.getByText(/11,96/)).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByText('ARS')).not.toBeInTheDocument();
    expect(screen.queryByText(/Precio base:/)).not.toBeInTheDocument();
  });

  it('replaces the loading fallback with the converted price once the quote arrives', () => {
    fx.formatMoney.mockReturnValue('—');
    fx.isLoading = true;
    const { rerender } = render(<ProductPurchasePrice price={price} />);
    expect(screen.getByText('USD')).toBeInTheDocument();

    fx.formatMoney.mockReturnValue('$ 15.428,40');
    fx.isLoading = false;
    rerender(<ProductPurchasePrice price={price} />);

    expect(screen.getByText('$ 15.428,40')).toBeInTheDocument();
    expect(screen.getByText('ARS')).toBeInTheDocument();
    expect(screen.getByText(/Precio base:.*11,96 USD/)).toBeInTheDocument();
    expect(screen.queryByText('Calculando el equivalente en pesos…')).not.toBeInTheDocument();
  });
});
