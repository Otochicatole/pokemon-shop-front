import { z } from 'zod';

export const auditEntrySchema = z.object({ id: z.string(), actorType: z.string(), actorId: z.string().nullable(), action: z.string(), entityType: z.string(), entityId: z.string().nullable(), metadata: z.unknown().nullable(), requestId: z.string().nullable(), createdAt: z.string() });
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export const auditListEnvelopeSchema = z.object({ data: z.array(auditEntrySchema), meta: z.object({ nextCursor: z.string().nullable() }) });

