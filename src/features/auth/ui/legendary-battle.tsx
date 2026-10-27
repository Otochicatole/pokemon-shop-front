'use client';

import Image from 'next/image';
import { useState } from 'react';
import { PokemonStage } from '@/components/pokemon-stage';
import styles from './legendary-battle.module.css';
import { legendaryCompanions, type LegendaryCompanion } from '../domain/legendary-companion';

const groundOffsets: Record<LegendaryCompanion['id'], string> = {
  mewtwo: '0%',
  moltres: '17.2%',
  raikou: '0%',
};

export function LegendaryBattle() {
  const [selectedId, setSelectedId] = useState<LegendaryCompanion['id']>('mewtwo');
  const selected = legendaryCompanions.find((companion) => companion.id === selectedId) ?? legendaryCompanions[0];

  return (
    <div className={`${styles.legendaryScene} hero-art legendary-scene`} aria-label="Elegí un Pokémon legendario">
      <div className={styles.legendaryArtwork}>
        <PokemonStage
          key={selected.id}
          variant="legendary"
          spriteUrl={selected.spriteUrl}
          alt={`${selected.name[0]}${selected.name.slice(1).toLowerCase()} pixelado`}
          groundOffset={groundOffsets[selected.id]}
          priority
        />
      </div>

      <div className={styles.legendaryBar}>
        <div className={styles.legendaryDialogue} aria-live="polite" aria-atomic="true">
          <strong>{selected.name[0]}{selected.name.slice(1).toLowerCase()}</strong>
          <span>{selected.message}</span>
        </div>
        <div className={`${styles.legendarySelector} legendary-selector`} role="group" aria-label="Elegir Pokémon legendario">
          {legendaryCompanions.map((companion) => {
            const name = companion.name[0] + companion.name.slice(1).toLowerCase();
            const active = companion.id === selected.id;

            return (
              <button
                key={companion.id}
                type="button"
                className={`${styles.legendaryOption} ${active ? styles.active : ''} legendary-option legendary-${companion.type} ${active ? 'active' : ''}`}
                aria-label={`Elegir a ${name}, tipo ${companion.typeLabel.toLowerCase()}`}
                aria-pressed={active}
                onClick={() => setSelectedId(companion.id)}
              >
                <Image src={companion.spriteUrl} alt="" width={42} height={42} unoptimized />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
