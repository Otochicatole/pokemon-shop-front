import { describe, expect, it } from 'vitest';
import { adminNewsSchema, newsFormSchema, newsSchema } from '@/features/news/domain/contracts';

describe('news contracts', () => {
  it('accepts text-only public news and rejects malformed ids', () => {
    expect(newsSchema.parse({ id: '11111111-1111-4111-8111-111111111111', title: 'Novedad', summary: 'Texto' })).toEqual({ id: '11111111-1111-4111-8111-111111111111', title: 'Novedad', summary: 'Texto' });
    expect(() => newsSchema.parse({ id: 'not-an-id', title: 'Novedad', summary: 'Texto' })).toThrow();
  });

  it('validates editorial limits and administrative versioned fields', () => {
    expect(() => newsFormSchema.parse({ title: 'x'.repeat(181), summary: '', sortOrder: 0, active: false, startsAt: '', endsAt: '' })).toThrow();
    expect(adminNewsSchema.parse({ id: '11111111-1111-4111-8111-111111111111', title: 'Novedad', summary: 'Texto', sortOrder: 2, active: false, startsAt: null, endsAt: null, version: 1, createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z' }).version).toBe(1);
  });
});
