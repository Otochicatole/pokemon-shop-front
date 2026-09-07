import Link from 'next/link';

export function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`site-footer ${className}`}>
      <div className="footer-main">
        <div className="footer-brand">
          <Link href="/" className="brand" aria-label="Card Shop, ir al inicio">
            <span className="brand-mark" aria-hidden="true">✦</span>
            <span className="footer-wordmark" aria-hidden="true"><span>Card</span><span>Shop</span></span>
          </Link>
        </div>

        <p className="footer-intro">
          Tu tienda de confianza para comenzar<br />
          la próxima aventura Pokémon.
        </p>

        <nav className="footer-column" aria-label="Tienda">
          <strong>Tienda</strong>
          <Link href="/catalog?kind=SINGLE_CARD">Cartas sueltas</Link>
          <Link href="/catalog?kind=SEALED_PRODUCT">Sobres y cajas</Link>
          <Link href="/catalog">Accesorios</Link>
        </nav>

        <nav className="footer-column" aria-label="Ayuda">
          <strong>Ayuda</strong>
          <span>Envíos</span>
          <span>Preguntas frecuentes</span>
          <span>Contacto</span>
        </nav>

        <div className="footer-newsletter">
          <strong>Correo del profesor</strong>
          <p>Recibí nuevos drops y reposiciones.</p>
          <div className="newsletter-field">
            <input type="email" placeholder="tu@email.com" aria-label="Email para novedades" />
            <button type="button" aria-label="Suscribirme">→</button>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>CONCEPTO FAN NO OFICIAL · POKÉMON PERTENECE A SUS RESPECTIVOS TITULARES</span>
        <span>HECHO CON ♥ PARA ENTRENADORES</span>
      </div>
    </footer>
  );
}
