import styles from './ProductAvailability.module.css';

export function ProductAvailability({ available, className = '' }: { available: number; className?: string }) {
  if (available === 0) return <p className={`${styles.stockMuted} stock-muted product-data ${className}`.trim()}>Agotado</p>;
  if (available <= 2) return <p className={`${styles.stockWarn} stock-warn product-data ${className}`.trim()}>{available === 1 ? 'Última unidad' : `Últimas ${available} unidades`}</p>;
  return <p className={`${styles.stockAvailable} stock-available product-data ${className}`.trim()}>En stock</p>;
}
