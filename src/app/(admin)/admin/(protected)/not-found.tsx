import Link from 'next/link';
import { AdminPageHeader } from '@/components';
import shared from '@/components/admin/admin-shared.module.css';

export default function AdminNotFound() {
  return (
    <>
      <AdminPageHeader eyebrow="404" title="Registro no encontrado" description="El recurso solicitado no existe o dejó de estar disponible." />
      <div className={shared.adminErrorPanel}>
        <Link className="button button-primary" href="/admin">Volver al dashboard</Link>
      </div>
    </>
  );
}
