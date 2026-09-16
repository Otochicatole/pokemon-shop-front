import Image from 'next/image';
import type { CSSProperties } from 'react';
import styles from './PokemonStage.module.css';

export type PokemonStageVariant = 'route' | 'legendary';

export interface PokemonStageProps {
  spriteUrl: string;
  alt: string;
  variant: PokemonStageVariant;
  groundOffset?: string;
  priority?: boolean;
  className?: string;
}


type StageStyle = CSSProperties & { '--pokemon-ground-offset': string };

export function PokemonStage({ spriteUrl, alt, variant, groundOffset = '0%', priority = false, className = '' }: PokemonStageProps) {
  const style: StageStyle = { '--pokemon-ground-offset': groundOffset };
  const variantClass = styles[variant] || '';

  return (
    <div className={`${styles.pokemonStage} ${variantClass} pokemon-stage pokemon-stage-${variant} ${className}`.trim()} data-pokemon-stage={variant}>
      <div className={`${styles.pokemonStageSprite} pokemon-stage-sprite`} style={style} data-pokemon-sprite>
        <Image src={spriteUrl} alt={alt} width={430} height={430} unoptimized priority={priority} />
      </div>
      <div className={`${styles.pokemonStagePlatform} pokemon-stage-platform`} aria-hidden="true" data-pokemon-platform />
    </div>
  );
}

