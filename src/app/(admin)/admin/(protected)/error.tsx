'use client';

import { useEffect } from 'react';
import { AdminPageHeader, Button } from '@/components';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <><AdminPageHeader eyebrow="Interrupción" title="No pudimos abrir este módulo" description="La sesión permanece protegida. Podés reintentar sin perder los cambios ya confirmados por el backend." /><div className="admin-error-panel"><div><p>{error.message || 'Ocurrió un error inesperado.'}</p><Button onClick={reset}>Reintentar</Button></div></div></>;
}

