import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewsCarousel } from '@/features/news';

const items = [
  { id: '11111111-1111-4111-8111-111111111111', title: 'Primera noticia', summary: 'Información uno' },
  { id: '22222222-2222-4222-8222-222222222222', title: 'Segunda noticia', summary: 'Información dos' },
];

afterEach(() => { vi.useRealTimers(); });

describe('NewsCarousel', () => {
  it('does not render a block when there are no publishable news items', () => {
    const { container } = render(<NewsCarousel items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders text-only news and supports previous, next and dot navigation', () => {
    render(<NewsCarousel items={items} />);
    expect(screen.getByRole('heading', { name: 'Primera noticia' })).toBeInTheDocument();
    expect(screen.queryByText('NEWS // 10')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Noticia siguiente' }));
    expect(screen.getByRole('heading', { name: 'Segunda noticia' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Mostrar noticia 1' }));
    expect(screen.getByRole('heading', { name: 'Primera noticia' })).toBeInTheDocument();
  });

  it('autoplays every five seconds and pauses while focused or hovered', () => {
    vi.useFakeTimers();
    render(<NewsCarousel items={items} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole('heading', { name: 'Segunda noticia' })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('region', { name: 'Noticias de la tienda' }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole('heading', { name: 'Segunda noticia' })).toBeInTheDocument();
  });
});
