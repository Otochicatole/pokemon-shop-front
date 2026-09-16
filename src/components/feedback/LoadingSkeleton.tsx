import styles from './LoadingSkeleton.module.css';

export function LoadingSkeleton({ count = 8, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`${styles.productGrid} product-grid ${className}`.trim()} aria-label="Cargando productos" aria-busy="true">
      {Array.from({ length: count }, (_, i) => <div className={`${styles.skeletonCard} skeleton-card`} key={i} />)}
    </div>
  );
}

