export function LoadingSkeleton({ count = 8, className = '' }: { count?: number; className?: string }) {
  return <div className={`product-grid ${className}`} aria-label="Cargando productos" aria-busy="true">{Array.from({ length: count }, (_, i) => <div className="skeleton-card" key={i} />)}</div>;
}
