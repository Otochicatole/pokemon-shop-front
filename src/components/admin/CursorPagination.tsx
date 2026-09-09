import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CursorPagination({ canPrevious, canNext, onPrevious, onNext, loading = false }: { canPrevious: boolean; canNext: boolean; onPrevious: () => void; onNext: () => void; loading?: boolean }) {
  return <nav className="admin-pagination" aria-label="Paginación"><button type="button" disabled={!canPrevious || loading} onClick={onPrevious}><ChevronLeft size={16} />Anterior</button><span>{loading ? 'Cargando…' : 'Página actual'}</span><button type="button" disabled={!canNext || loading} onClick={onNext}>Siguiente<ChevronRight size={16} /></button></nav>;
}
