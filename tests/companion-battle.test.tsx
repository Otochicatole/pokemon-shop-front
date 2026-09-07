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
  it('changes the sprite, HUD and dialogue when a companion is selected', async () => {
    const user = userEvent.setup();
    render(<CompanionBattle />);

    expect(screen.getByRole('button', { name: 'ELÉCTRICO' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Pikachu pixelado' })).toBeInTheDocument();

    const fireOption = screen.getByRole('button', { name: 'FUEGO' });
    await user.click(fireOption);

    expect(fireOption).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'ELÉCTRICO' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: 'Charmander pixelado' })).toBeInTheDocument();
    expect(screen.getByText('La llama de su cola ilumina el sendero.')).toBeInTheDocument();
  });

  it('supports keyboard activation through native buttons', async () => {
    const user = userEvent.setup();
    render(<CompanionBattle />);

    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'FUEGO' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'FUEGO' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the active sprite and platform in one shared stage', () => {
    const { container } = render(<CompanionBattle />);
    const stage = container.querySelector('[data-pokemon-stage="route"]');

    expect(stage).toContainElement(container.querySelector('[data-pokemon-sprite]'));
    expect(stage).toContainElement(container.querySelector('[data-pokemon-platform]'));
  });
});
