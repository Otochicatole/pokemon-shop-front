import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LegendaryBattle } from '@/features/auth';

vi.mock('next/image', () => ({
  default: ({ alt = '', src }: { alt?: string; src?: string }) => alt
    ? <span role="img" aria-label={alt} data-src={src} />
    : <span aria-hidden="true" data-src={src} />,
}));

describe('LegendaryBattle', () => {
  it('keeps every legendary on the shared stage when changing selection', async () => {
    const user = userEvent.setup();
    const { container } = render(<LegendaryBattle />);

    const stage = container.querySelector('[data-pokemon-stage="legendary"]');
    expect(stage).toContainElement(container.querySelector('[data-pokemon-sprite]'));
    expect(stage).toContainElement(container.querySelector('[data-pokemon-platform]'));

    await user.click(screen.getByRole('button', { name: 'FUEGO' }));

    expect(screen.getByRole('img', { name: 'Moltres pixelado' })).toBeInTheDocument();
    expect(container.querySelector<HTMLElement>('[data-pokemon-sprite]')).toHaveStyle({
      '--pokemon-ground-offset': '17.2%',
    });
  });
});
