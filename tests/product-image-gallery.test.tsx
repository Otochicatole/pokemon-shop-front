import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImgHTMLAttributes } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductImageGallery } from '@/app/(store)/products/[slug]/product-image-gallery';

vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  ),
}));
afterEach(cleanup);

const images = [
  { id: 'front', url: '/front.png', altText: 'Bulbasaur, frente', sortOrder: 0 },
  { id: 'back', url: '/back.png', altText: 'Bulbasaur, reverso', sortOrder: 1 },
];

describe('product image gallery', () => {
  it('changes the selected image and expands it with navigation and Escape close', async () => {
    const user = userEvent.setup();
    render(<ProductImageGallery images={images} productName="Bulbasaur" sku="BUL-17373" />);
    await user.click(screen.getByRole('button', { name: 'Ver imagen 2' }));
    expect(screen.getByRole('button', { name: 'Ver imagen 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Bulbasaur, reverso' })).toHaveAttribute('src', '/back.png');
    const opener = screen.getByRole('button', { name: 'Ampliar imagen de Bulbasaur' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Bulbasaur' });
    expect(within(dialog).getByRole('img', { name: 'Bulbasaur, reverso' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Ver en detalle' }));
    expect(within(dialog).getByRole('button', { name: 'Ajustar imagen' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(dialog).getByRole('region', { name: 'Vista ampliada de Bulbasaur' })).toHaveAttribute('tabindex', '0');
    expect(within(dialog).getByText('Desplazá la imagen para ver los detalles.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Ajustar imagen' }));
    expect(within(dialog).getByRole('button', { name: 'Ver en detalle' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(dialog).getByRole('button', { name: 'Imagen siguiente' }));
    expect(within(dialog).getByRole('img', { name: 'Bulbasaur, frente' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('shows a useful empty state without an unavailable zoom action', () => {
    render(<ProductImageGallery images={[]} productName="Bulbasaur" sku="BUL-17373" />);
    expect(screen.getByText('Imagen no disponible')).toBeInTheDocument();
    expect(screen.getByText('BUL-17373')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('replaces a broken image and keeps the remaining views usable', async () => {
    const user = userEvent.setup();
    render(<ProductImageGallery images={images} productName="Bulbasaur" sku="BUL-17373" />);
    fireEvent.error(screen.getByRole('img', { name: 'Bulbasaur, frente' }));
    expect(screen.getByText('No pudimos cargar esta imagen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ampliar imagen de Bulbasaur' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver imagen 2' }));
    expect(screen.getByRole('button', { name: 'Ampliar imagen de Bulbasaur' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bulbasaur, reverso' })).toBeInTheDocument();
  });
});
