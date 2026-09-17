import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`${styles.siteFooter} site-footer ${className}`.trim()}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href="/" className={`${styles.brand} brand`} aria-label="Card Shop, ir al inicio">
            <span className={`${styles.brandMark} brand-mark`} aria-hidden="true">✦</span>
            <span className={styles.footerWordmark} aria-hidden="true">
              <span>Card</span>
              <span>Shop</span>
            </span>
          </Link>
          <p className={styles.footerTagline}>
            Tu tienda de confianza para la próxima aventura Pokémon.
          </p>
        </div>

        <p className={styles.footerLegal}>
          Concepto fan no oficial · Pokémon pertenece a sus respectivos titulares
        </p>
      </div>
    </footer>
  );
}
