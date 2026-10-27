import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompanionBattle } from '@/features/home';

vi.mock('next/image', () => ({
  default: ({ alt = '', src }: { alt?: string; src?: string }) => alt
    ? <span role="img" aria-label={alt} data-src={src} />
    : <span aria-hidden="true" data-src={src} />,
}));

describe('CompanionBattle', () => {
  it('changes the artwork and announces the selected companion', async () => {
    const user = userEvent.setup();
    render(<CompanionBattle />);
    expect(screen.getByRole('button', { name: 'Elegir a Pikachu' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Pikachu pixelado' })).toBeInTheDocument();
    const fireOption = screen.getByRole('button', { name: 'Elegir a Charmander' });
    await user.click(fireOption);
    expect(fireOption).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Elegir a Pikachu' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: 'Charmander pixelado' })).toBeInTheDocument();
    expect(screen.getByText('Charmander').closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });

  it('supports keyboard activation through native buttons', async () => {
    const user = userEvent.setup();
    render(<CompanionBattle />);
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Elegir a Charmander' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Elegir a Charmander' })).toHaveAttribute('aria-pressed', 'true');
  });
});
