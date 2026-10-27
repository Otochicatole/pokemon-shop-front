'use client';

import Image from 'next/image';
import { useState, type CSSProperties } from 'react';
import { PokemonStage } from '@/components/pokemon-stage';
import { companions, type Companion } from '../domain/companion';
import styles from './companion-battle.module.css';

export function CompanionBattle({
  selectedId: controlledId,
  onSelect,
}: {
  selectedId?: Companion['id'];
  onSelect?: (id: Companion['id']) => void;
} = {}) {
  const [internalId, setInternalId] = useState<Companion['id']>(companions[0].id);
  const activeId = controlledId ?? internalId;
  const selected = companions.find((companion) => companion.id === activeId) ?? companions[0];
  const displayName = selected.name[0] + selected.name.slice(1).toLowerCase();

  const handleSelect = (id: Companion['id']) => {
    setInternalId(id);
    onSelect?.(id);
  };

  return (
    <div className={styles.scene} aria-label="Elegí tu compañero Pokémon">
      <div className={styles.artwork}>
        <PokemonStage
          key={selected.id}
          variant="route"
          spriteUrl={selected.spriteUrl}
          alt={`${displayName} pixelado`}
          priority
          className={styles.heroSprite}
        />
      </div>
      <div className={styles.companionBar}>
        <div className={styles.caption} aria-live="polite">
          <strong>{displayName}</strong>
          <span>Elegí tu compañero</span>
        </div>
        <div className={styles.selector} role="group" aria-label="Elegir compañero">
          {companions.map((companion) => (
            <button
              key={companion.id}
              type="button"
              aria-label={`Elegir a ${companion.name[0]}${companion.name.slice(1).toLowerCase()}`}
              aria-pressed={companion.id === selected.id}
              style={{ '--companion-bg': companion.bgColor } as CSSProperties}
              onClick={() => handleSelect(companion.id)}
            >
              <Image src={companion.spriteUrl} alt="" width={42} height={42} unoptimized />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
