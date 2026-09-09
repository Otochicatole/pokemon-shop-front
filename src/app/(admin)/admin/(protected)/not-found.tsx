import Link from 'next/link';
import { AdminPageHeader } from '@/components';

export default function AdminNotFound() { return <><AdminPageHeader eyebrow="404" title="Registro no encontrado" description="El recurso solicitado no existe o dejó de estar disponible." /><div className="admin-error-panel"><Link className="button button-primary" href="/admin">Volver al dashboard</Link></div></>; }

