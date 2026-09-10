import type { SupportConversationStatus } from '../domain/contracts';

const labels: Record<SupportConversationStatus, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
};

const tones: Record<SupportConversationStatus, string> = {
  OPEN: 'cyan',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  CLOSED: 'muted',
};

export function supportStatusLabel(status: SupportConversationStatus) {
  return labels[status];
}

export function SupportStatusBadge({ status }: { status: SupportConversationStatus }) {
  return <span className={`admin-badge admin-badge-${tones[status]}`}>{labels[status]}</span>;
}

