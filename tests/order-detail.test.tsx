import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderDetail } from '@/features/orders/ui/order-detail';
import type { Order } from '@/shared/api/contracts';

const mocks = vi.hoisted(() => ({
  getOrder: vi.fn(),
  refreshOrderPaymentStatus: vi.fn(),
  cancelOrder: vi.fn(),
  confirmSellerOrder: vi.fn(),
  openSellerOrderIssue: vi.fn(),
  resumePaymentSession: vi.fn(),
  uploadReceipt: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/link', () => ({ default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));
vi.mock('@/features/orders/infrastructure/api', () => ({
  getOrder: mocks.getOrder,
  refreshOrderPaymentStatus: mocks.refreshOrderPaymentStatus,
  cancelOrder: mocks.cancelOrder,
  confirmSellerOrder: mocks.confirmSellerOrder,
  openSellerOrderIssue: mocks.openSellerOrderIssue,
}));
vi.mock('@/features/checkout/infrastructure/api', () => ({
  resumePaymentSession: mocks.resumePaymentSession,
  uploadReceipt: mocks.uploadReceipt,
}));

const money = { amountMinor: '1000', currency: 'USD' } as const;
const pendingOrder = {
  id: 'order-1',
  number: 'ORDER-1',
  status: 'PENDING_PAYMENT',
  paymentMethod: 'MERCADO_PAGO',
  fulfillmentType: 'PICKUP',
  totals: { subtotal: money, discount: { amountMinor: '0', currency: 'USD' }, shipping: { amountMinor: '0', currency: 'USD' }, total: money },
  loyalty: {
    programVersion: null,
    pointsRedeemed: 0,
    pointsDiscount: { amountMinor: '0', currency: 'USD' },
    pointsEarned: 0,
    redemptionStatus: 'NONE',
    spendPerPoint: null,
    pointValue: null,
  },
  items: [{ productId: 'product-1', sku: 'SKU-1', name: 'Carta de prueba', quantity: 1, unitPrice: money, lineTotal: money }],
  timeline: [],
  sellerOrders: [],
  payment: { method: 'MERCADO_PAGO', status: 'PENDING', paymentSessionStatus: 'READY' },
  createdAt: '2026-09-15T12:00:00.000Z',
} satisfies Order;

function renderOrderDetail(client: QueryClient) {
  return render(<QueryClientProvider client={client}><OrderDetail number={pendingOrder.number} /></QueryClientProvider>);
}

describe('order payment status refresh', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', `/account/orders/${pendingOrder.number}`);
    mocks.getOrder.mockReset().mockResolvedValue(pendingOrder);
    mocks.refreshOrderPaymentStatus.mockReset().mockResolvedValue(undefined);
    mocks.toastError.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reconciles with the backend before refetching when the manual refresh button is used', async () => {
    vi.useFakeTimers();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(['order', pendingOrder.number], pendingOrder);
    renderOrderDetail(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    const callsBeforeRefresh = mocks.getOrder.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado' }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.refreshOrderPaymentStatus).toHaveBeenCalledOnce();
    expect(mocks.refreshOrderPaymentStatus).toHaveBeenCalledWith(pendingOrder.number);
    expect(mocks.getOrder.mock.calls.length).toBeGreaterThan(callsBeforeRefresh);
    expect(mocks.refreshOrderPaymentStatus.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.getOrder.mock.invocationCallOrder[callsBeforeRefresh]);
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Actualizar estado' })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(screen.getByRole('button', { name: 'Actualizar estado' })).toBeInTheDocument();
  });
});
