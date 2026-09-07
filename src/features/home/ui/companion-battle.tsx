'use client';

import Image from 'next/image';
import { useState } from 'react';
import { companions, type Companion } from '../domain/companion';

export function CompanionBattle() {
  const [selectedId, setSelectedId] = useState<Companion['id']>('pikachu');
  const selected = companions.find((companion) => companion.id === selectedId) ?? companions[0];

  return (
    <div className="hero-art battle-scene" aria-label="Elegí tu compañero Pokémon">
      <div className="route-label" aria-hidden="true">RUTA 10 <span /> CENTRAL POKÉMON DE ENTRENADORES</div>

      <div className="battle-hud" aria-label={`${selected.name}, nivel ${selected.level}, ${selected.hp} puntos de salud`}>
        <span>{selected.name}</span>
        <b>Lv. {selected.level}</b>
        <div aria-hidden="true"><i /><i /><i /><i /></div>
        <small>HP {selected.hp} / {selected.maxHp}</small>
      </div>

      <div className="hero-sprite" key={selected.id}>
        <Image src={selected.spriteUrl} alt={`${selected.name[0]}${selected.name.slice(1).toLowerCase()} pixelado`} width={430} height={430} unoptimized priority />
      </div>
      <div className="battle-platform" aria-hidden="true" />

      <div className="dialogue" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">▶</span>
        <div>
          <b>{selected.name}</b>
          <span>{selected.message}</span>
          <small>{selected.detail}</small>
        </div>
      </div>

      <div className="companion-selector" role="group" aria-label="Elegir compañero">
        {companions.map((companion) => {
          const active = companion.id === selected.id;
          return (
            <button
              key={companion.id}
              type="button"
              className={`companion-option companion-${companion.type} ${active ? 'active' : ''}`}
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
