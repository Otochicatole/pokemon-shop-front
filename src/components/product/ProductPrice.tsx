import { formatMoney } from '@/shared/lib/format';
import type { Money } from '@/shared/api/contracts';
export function ProductPrice({ price, className = '' }: { price: Money; className?: string }) { return <strong className={`product-price ${className}`}>{formatMoney(price)}</strong>; }
