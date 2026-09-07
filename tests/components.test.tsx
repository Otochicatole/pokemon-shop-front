import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, DangerButton, PixelBadge, SectionHeading, EmptyState } from '@/components';

vi.mock('next/link', () => ({ default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('next/image', () => ({ default: ({ alt = '' }: { alt?: string }) => <span role="img" aria-label={alt} /> }));

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
});
