import { z } from 'zod';

const dateTime = z.string().datetime();

export const newsSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  summary: z.string(),
});

export const publicNewsListSchema = z.object({
  data: z.array(newsSchema),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const adminNewsSchema = z.object({
  id: z.string().uuid(), title: z.string(), summary: z.string(), sortOrder: z.number().int(), active: z.boolean(),
  startsAt: dateTime.nullable(), endsAt: dateTime.nullable(), version: z.number().int(), createdAt: dateTime, updatedAt: dateTime,
});

export const adminNewsListEnvelopeSchema = z.object({
  data: z.array(adminNewsSchema),
  meta: z.object({ nextCursor: z.string().nullable().optional() }),
});
export const adminNewsDetailEnvelopeSchema = z.object({ data: z.object({ news: adminNewsSchema }), meta: z.record(z.string(), z.unknown()).optional() });

export const newsFormSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(180, 'Máximo 180 caracteres'),
  summary: z.string().trim().max(500, 'Máximo 500 caracteres'),
  sortOrder: z.number().int().min(0).max(1_000_000),
  active: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string(),
});

export type News = z.infer<typeof newsSchema>;
export type AdminNews = z.infer<typeof adminNewsSchema>;
export type NewsFormValues = z.infer<typeof newsFormSchema>;
