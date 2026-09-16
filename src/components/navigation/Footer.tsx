import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`${styles.siteFooter} site-footer ${className}`.trim()}>
      <div className={`${styles.footerMain} footer-main`}>
        <div className={`${styles.footerBrand} footer-brand`}>
          <Link href="/" className={`${styles.brand} brand`} aria-label="Card Shop, ir al inicio">
            <span className={`${styles.brandMark} brand-mark`} aria-hidden="true">✦</span>
            <span className={`${styles.footerWordmark} footer-wordmark`} aria-hidden="true"><span>Card</span><span>Shop</span></span>
          </Link>
        </div>

        <p className={`${styles.footerIntro} footer-intro`}>
          Tu tienda de confianza para comenzar<br />
          la próxima aventura Pokémon.
        </p>

        <nav className={`${styles.footerColumn} footer-column`} aria-label="Tienda">
          <strong>Tienda</strong>
          <Link href="/catalog?kind=SINGLE_CARD">Cartas sueltas</Link>
          <Link href="/catalog?kind=SEALED_PRODUCT">Sobres y cajas</Link>
          <Link href="/catalog">Accesorios</Link>
        </nav>

        <nav className={`${styles.footerColumn} footer-column`} aria-label="Ayuda">
          <strong>Ayuda</strong>
          <span>Envíos</span>
          <span>Preguntas frecuentes</span>
          <span>Contacto</span>
        </nav>

        <div className={`${styles.footerNewsletter} footer-newsletter`}>
          <strong>Correo del profesor</strong>
          <p>Recibí nuevos drops y reposiciones.</p>
          <div className={`${styles.newsletterField} newsletter-field`}>
            <input type="email" placeholder="tu@email.com" aria-label="Email para novedades" />
            <button type="button" aria-label="Suscribirme">→</button>
          </div>
        </div>
      </div>

      <div className={`${styles.footerBottom} footer-bottom`}>
        <span>CONCEPTO FAN NO OFICIAL · POKÉMON PERTENECE A SUS RESPECTIVOS TITULARES</span>
        <span>HECHO CON ♥ PARA ENTRENADORES</span>
      </div>
    </footer>
  );
}

