import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AnchorHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, DangerButton, Header, PixelBadge, SectionHeading, EmptyState } from '@/components';

vi.mock('next/link', () => ({ default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/image', () => ({ default: ({ alt = '' }: { alt?: string }) => <span role="img" aria-label={alt} /> }));
vi.mock('@/features/auth/infrastructure/api', () => ({ getMe: vi.fn().mockResolvedValue({ name: 'Coleccionista', email: 'collector@example.test' }) }));
vi.mock('@/features/loyalty/infrastructure/api', () => ({ getLoyaltyAccount: vi.fn().mockResolvedValue({ account: { available: 17 } }) }));

describe('component library', () => {
  it('exposes typed button variants with accessible state', () => {
    render(<><Button disabled>Comprar</Button><DangerButton>Eliminar</DangerButton></>);
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveClass('button-danger');
  });

  it('renders themed badges and headings through public APIs', () => {
    render(<><PixelBadge tone="cyan">En stock</PixelBadge><SectionHeading title="Catálogo" /><EmptyState title="Sin resultados" /></>);
    expect(screen.getByText('En stock')).toHaveClass('pixel-badge-cyan');
    expect(screen.getByRole('heading', { name: 'Catálogo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeInTheDocument();
  });

  it('shows the authenticated points balance beside the cart', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><Header /></QueryClientProvider>);
    const points = await screen.findByRole('link', { name: 'Puntos disponibles: 17' });
    const cart = screen.getByRole('link', { name: 'Carrito, 0 productos' });
    expect(points).toHaveAttribute('href', '/account/points');
    expect(points.compareDocumentPosition(cart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
