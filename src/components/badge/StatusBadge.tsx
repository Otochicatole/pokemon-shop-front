import { PixelBadge, type BadgeTone } from './PixelBadge';

export function StatusBadge({ status, tone = 'cyan', className = '' }: { status: string; tone?: BadgeTone; className?: string; }) {
  return <PixelBadge tone={tone} className={className}>{status}</PixelBadge>;
}
