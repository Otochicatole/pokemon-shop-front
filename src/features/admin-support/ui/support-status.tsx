import type { SupportConversationStatus } from '../domain/contracts';
import { adminShared } from '@/components/admin/admin-shared';

const labels: Record<SupportConversationStatus, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
};

const toneClass = {
  cyan: adminShared.badgeCyan,
  yellow: adminShared.badgeYellow,
  green: adminShared.badgeGreen,
  muted: adminShared.badgeMuted,
} as const;

export function supportStatusLabel(status: SupportConversationStatus) {
  return labels[status];
}

export function SupportStatusBadge({ status }: { status: SupportConversationStatus }) {
  const tone = { OPEN: 'cyan', IN_PROGRESS: 'yellow', RESOLVED: 'green', CLOSED: 'muted' }[status] as keyof typeof toneClass;
  return <span className={`${adminShared.adminBadge} ${toneClass[tone]}`}>{labels[status]}</span>;
}

