'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { News } from '../domain/contracts';

import styles from './news-carousel.module.css';

type NewsCarouselProps = {
  items: News[];
  variant?: 'section' | 'hero';
  /** Intervalo de rotación automática en milisegundos. */
  intervalMs?: number;
  onActiveChange?: (item: News) => void;
};

const DEFAULT_INTERVAL_MS = 5000;

export function NewsCarousel({ items, variant = 'section', intervalMs = DEFAULT_INTERVAL_MS, onActiveChange }: NewsCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;
  const activeIndex = items.length ? Math.min(index, items.length - 1) : 0;
  const item = items[activeIndex];
  const rotationMs = Number.isFinite(intervalMs) && intervalMs >= 2000 ? intervalMs : DEFAULT_INTERVAL_MS;

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (items.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), rotationMs);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reducedMotion, rotationMs]);

  useEffect(() => {
    if (item) onActiveChangeRef.current?.(item);
  }, [item]);

  if (!items.length || !item) return null;

  const move = (direction: -1 | 1) => setIndex((current) => (current + direction + items.length) % items.length);
  const Heading = variant === 'hero' ? 'h1' : 'h2';
  const variantClass = variant === 'hero' ? styles.newsCarouselHero : '';

  return (
    <section
      className={`${styles.newsCarousel} ${variantClass} news-carousel news-carousel-${variant}`}
      aria-label="Noticias de la tienda"
      aria-roledescription="carrusel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    >
      <div className={`${styles.newsCarouselHeading} news-carousel-heading`}>
        <p className="eyebrow">{variant === 'hero' ? 'Ruta 10 // novedades de la tienda' : 'Novedades // Card Shop'}</p>
        <span>{activeIndex + 1} / {items.length}</span>
      </div>
      <div className={`${styles.newsCarouselStage} news-carousel-stage`} aria-live="polite">
        <div key={item.id} className={`${styles.newsCarouselCopy} news-carousel-copy`}>
          <p className={`${styles.newsCarouselKicker} news-carousel-kicker`}>Noticias de la comunidad</p>
          <Heading>{item.title}</Heading>
          <p>{item.summary}</p>
        </div>
      </div>
      {items.length > 1 && (
        <div className={`${styles.newsCarouselNavigation} news-carousel-navigation`}>
          <div className={`${styles.newsCarouselDots} news-carousel-dots`} role="tablist" aria-label="Seleccionar noticia">
            {items.map((entry, dotIndex) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={dotIndex === activeIndex}
                aria-label={`Mostrar noticia ${dotIndex + 1}`}
                className={`${dotIndex === activeIndex ? `${styles.isActive} is-active` : ''}`}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
          <div className={`${styles.newsCarouselControls} news-carousel-controls`}>
            <button
              type="button"
              className={`${styles.newsCarouselControl} news-carousel-control news-carousel-control-prev`}
              onClick={() => move(-1)}
              aria-label="Noticia anterior"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className={`${styles.newsCarouselControl} news-carousel-control news-carousel-control-next`}
              onClick={() => move(1)}
              aria-label="Noticia siguiente"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
