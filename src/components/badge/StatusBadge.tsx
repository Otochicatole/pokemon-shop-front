import { PixelBadge, type BadgeTone } from './PixelBadge';
import styles from './StatusBadge.module.css';

export function StatusBadge({ status, tone = 'cyan', className = '' }: { status: string; tone?: BadgeTone; className?: string; }) {
  return <PixelBadge tone={tone} className={`${styles.statusBadge} ${className}`.trim()}>{status}</PixelBadge>;
}

