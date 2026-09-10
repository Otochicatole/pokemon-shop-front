'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { News } from '../domain/contracts';

type NewsCarouselProps = {
  items: News[];
  variant?: 'section' | 'hero';
};

export function NewsCarousel({ items, variant = 'section' }: NewsCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (items.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 5000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reducedMotion]);

  if (!items.length) return null;
  const activeIndex = Math.min(index, items.length - 1);
  const item = items[activeIndex]!;
  const move = (direction: -1 | 1) => setIndex((current) => (current + direction + items.length) % items.length);
  const Heading = variant === 'hero' ? 'h1' : 'h2';

  return <section className={`news-carousel news-carousel-${variant}`} aria-label="Noticias de la tienda" aria-roledescription="carrusel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <div className="news-carousel-heading"><p className="eyebrow">{variant === 'hero' ? 'Ruta 10 // novedades de la tienda' : 'Novedades // Card Shop'}</p><span>{activeIndex + 1} / {items.length}</span></div>
    <div className="news-carousel-stage" aria-live="polite">
      <div className="news-carousel-copy"><p className="news-carousel-kicker">Noticias de la comunidad</p><Heading>{item.title}</Heading><p>{item.summary}</p></div>
    </div>
    {items.length > 1 && <div className="news-carousel-navigation"><div className="news-carousel-dots" role="tablist" aria-label="Seleccionar noticia">{items.map((entry, dotIndex) => <button key={entry.id} type="button" role="tab" aria-selected={dotIndex === activeIndex} aria-label={`Mostrar noticia ${dotIndex + 1}`} className={dotIndex === activeIndex ? 'is-active' : ''} onClick={() => setIndex(dotIndex)} />)}</div><div className="news-carousel-controls"><button type="button" className="news-carousel-control news-carousel-control-prev" onClick={() => move(-1)} aria-label="Noticia anterior"><ChevronLeft size={22} /></button><button type="button" className="news-carousel-control news-carousel-control-next" onClick={() => move(1)} aria-label="Noticia siguiente"><ChevronRight size={22} /></button></div></div>}
  </section>;
}
