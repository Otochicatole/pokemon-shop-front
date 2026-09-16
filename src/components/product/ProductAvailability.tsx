import styles from './ProductAvailability.module.css';

export function ProductAvailability({ available, className = '' }: { available: number; className?: string }) {
  if (available === 0) return <p className={`${styles.stockMuted} stock-muted ${className}`.trim()}>Agotado</p>;
  if (available <= 2) return <p className={`${styles.stockWarn} stock-warn ${className}`.trim()}>Últimas {available} unidades</p>;
  return <p className={`${styles.stockAvailable} stock-available ${className}`.trim()}>En stock</p>;
}

