'use client';

import Image from 'next/image';
import { useState } from 'react';
import { legendaryCompanions, type LegendaryCompanion } from '../domain/legendary-companion';

export function LegendaryBattle() {
  const [selectedId, setSelectedId] = useState<LegendaryCompanion['id']>('mewtwo');
  const selected = legendaryCompanions.find((companion) => companion.id === selectedId) ?? legendaryCompanions[0];

  return (
    <div className="hero-art legendary-scene" aria-label="Elegí un Pokémon legendario">
      <div className="legendary-label" aria-hidden="true">ARCHIVO LEGENDARIO <span /> CÁMARA CELESTIAL</div>

      <div className="legendary-hud" aria-label={`${selected.name}, nivel ${selected.level}, ${selected.hp} puntos de salud`}>
        <span>{selected.name}</span>
        <b>Lv. {selected.level}</b>
        <div aria-hidden="true"><i /><i /><i /><i /></div>
        <small>HP {selected.hp} / {selected.maxHp}</small>
      </div>

      <div className="legendary-sprite" key={selected.id}>
        <Image src={selected.spriteUrl} alt={`${selected.name[0]}${selected.name.slice(1).toLowerCase()} pixelado`} width={430} height={430} unoptimized priority />
      </div>
      <div className="legendary-platform" aria-hidden="true" />

      <div className="legendary-dialogue" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">▶</span>
        <div>
          <b>{selected.name}</b>
          <span>{selected.message}</span>
          <small>{selected.detail}</small>
        </div>
      </div>

      <div className="legendary-selector" role="group" aria-label="Elegir Pokémon legendario">
        {legendaryCompanions.map((companion) => {
          const active = companion.id === selected.id;
          return (
            <button
              key={companion.id}
              type="button"
              className={`legendary-option legendary-${companion.type} ${active ? 'active' : ''}`}
              aria-pressed={active}
              onClick={() => setSelectedId(companion.id)}
            >
              <Image src={companion.spriteUrl} alt="" width={52} height={52} unoptimized />
              <span>{companion.typeLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
