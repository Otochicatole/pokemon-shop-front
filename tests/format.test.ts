import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/shared/lib/format';

describe('money formatting', () => {
  it('renders USD with an unambiguous currency marker in Spanish locale', () => {
    expect(formatMoney({ amountMinor: '1234', currency: 'USD' })).toContain('US$');
  });
});
