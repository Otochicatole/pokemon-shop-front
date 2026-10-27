'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CompanionBattle } from './companion-battle';
import { companions, type Companion } from '../domain/companion';
import styles from '../../../app/(store)/page.module.css';

export function HomeHero() {
  const [selectedId, setSelectedId] = useState<Companion['id']>(companions[0].id);
  const selected = companions.find((companion) => companion.id === selectedId) ?? companions[0];

  return (
    <section className={styles.hero} aria-label="Portada">
      <div className={styles.heroCopy}>
        <h1>
          Tu próxima carta.
          <br />
          <span
            key={selected.id}
            className={styles.heroDynamicLine}
            style={{ color: selected.bgColor }}
          >
            {selected.heroLine}
          </span>
        </h1>
        <p className={styles.heroText}>
          Cartas Pokémon, productos sellados y accesorios para disfrutar cada momento de tu colección.
        </p>
        <div className={styles.heroActions}>
          <Link className="button button-primary" href="/catalog">
            Explorar catálogo <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link className={styles.textButton} href="/catalog?kind=SINGLE_CARD">
            Cartas sueltas <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <CompanionBattle selectedId={selected.id} onSelect={setSelectedId} />
    </section>
  );
}
