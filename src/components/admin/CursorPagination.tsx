import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CursorPagination.module.css';

export function CursorPagination({
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  loading = false,
}: {
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  loading?: boolean;
}) {
  const label = loading
    ? 'Cargando…'
    : canPrevious || canNext
      ? 'Más resultados'
      : 'Fin de la lista';

  return (
    <nav className={`${styles.adminPagination} admin-pagination`} aria-label="Paginación">
      <button type="button" disabled={!canPrevious || loading} onClick={onPrevious}>
        <ChevronLeft size={16} />
        Anterior
      </button>
      <span>{label}</span>
      <button type="button" disabled={!canNext || loading} onClick={onNext}>
        Siguiente
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
