import Link from 'next/link';
import { config } from '@/shared/config/env';
import styles from './Footer.module.css';

export function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`${styles.siteFooter} site-footer ${className}`.trim()}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <p className={styles.footerTagline}>
            Cartas y coleccionables Pokémon para seguir ampliando tu colección.
          </p>
        </div>

        <p className={styles.footerLegal}>
          Concepto fan no oficial · Pokémon pertenece a sus respectivos titulares
        </p>
      </div>
    </footer>
  );
}
