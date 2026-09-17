'use client';

import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { CompanionBattle } from '@/features/home';
import { NewsCarousel } from '@/features/news';
import type { News } from '@/features/news';
import styles from '../../../app/(store)/page.module.css';

function HeroActions() {
  return (
    <div className={styles.heroActions}>
      <Link className="button button-primary" href="/catalog">
        Entrar a la tienda <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
      <Link className={styles.textButton} href="/catalog?kind=SINGLE_CARD">
        Atacar <Sparkles size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function HomeHero({ news }: { news: News[] }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(news[0]?.coverUrl ?? null);

  return (
    <section className={styles.hero} aria-label="Portada">
      <div
        className={`${styles.heroCopy} ${coverUrl ? styles.heroCopyWallpaper : ''}`}
        style={coverUrl ? { ['--hero-wallpaper' as string]: `url(${coverUrl})` } : undefined}
      >
        {news.length ? (
          <>
            <NewsCarousel
              items={news}
              variant="hero"
              onActiveChange={(item) => setCoverUrl(item.coverUrl)}
            />
            <HeroActions />
          </>
        ) : (
          <>
            <p className="eyebrow">Ruta 10 // central de coleccionistas</p>
            <h1>
              Viví la aventura.
              <br />
              <em>Coleccioná.</em>
            </h1>
            <p className={styles.heroText}>
              Cartas Pokémon, productos sellados y equipo para entrenadores. Explorá el catálogo y
              encontrá tu próxima pieza favorita.
            </p>
            <HeroActions />
          </>
        )}
      </div>
      <CompanionBattle />
    </section>
  );
}
