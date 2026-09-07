import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PokemonStage } from '@/components/pokemon-stage';

vi.mock('next/image', () => ({
  default: ({ alt = '', src }: { alt?: string; src?: string }) => <span role="img" aria-label={alt} data-src={src} />,
}));

describe('PokemonStage', () => {
  it('keeps the sprite and platform inside the same positioning context', () => {
    const { container } = render(<PokemonStage variant="legendary" spriteUrl="/raikou.gif" alt="Raikou pixelado" groundOffset="8%" />);
    const stage = container.querySelector<HTMLElement>('[data-pokemon-stage="legendary"]');
    const sprite = container.querySelector<HTMLElement>('[data-pokemon-sprite]');
    const platform = container.querySelector<HTMLElement>('[data-pokemon-platform]');

    expect(stage).toContainElement(sprite);
    expect(stage).toContainElement(platform);
    expect(sprite).toHaveStyle({ '--pokemon-ground-offset': '8%' });
    expect(screen.getByRole('img', { name: 'Raikou pixelado' })).toBeInTheDocument();
  });
});
