import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CompanionBattle } from '@/features/home';
import styles from '../../../app/(store)/page.module.css';

export function HomeHero() {
  return (
    <section className={styles.hero} aria-label="Portada">
      <div className={styles.heroCopy}>
        <h1>Tu próxima carta.<br /><span>Tu próxima historia.</span></h1>
        <p className={styles.heroText}>Cartas Pokémon, productos sellados y accesorios para disfrutar cada momento de tu colección.</p>
        <div className={styles.heroActions}>
          <Link className="button button-primary" href="/catalog">Explorar catálogo <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link className={styles.textButton} href="/catalog?kind=SINGLE_CARD">Cartas sueltas <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      <CompanionBattle />
    </section>
  );
}
