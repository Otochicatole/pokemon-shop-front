import { z } from 'zod';

export const supportConversationStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
export const supportActorTypeSchema = z.enum(['USER', 'ADMIN']);

export const supportUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
});

export const supportMessageSenderSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

export const supportConversationSchema = z.object({
  id: z.string(),
  status: supportConversationStatusSchema,
  subject: z.string(),
  user: supportUserSchema,
  createdByType: supportActorTypeSchema,
  lastMessageAt: z.string().nullable(),
  lastMessagePreview: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  unreadCount: z.number().int().nonnegative(),
});

export const supportMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderType: supportActorTypeSchema,
  sender: supportMessageSenderSchema,
  content: z.string(),
  createdAt: z.string(),
});

export const supportListEnvelopeSchema = z.object({
  data: z.array(supportConversationSchema),
  meta: z.object({ nextCursor: z.string().nullable() }),
});

export const supportConversationEnvelopeSchema = z.object({
  data: z.object({
    conversation: supportConversationSchema,
    messages: z.array(supportMessageSchema),
  }),
  meta: z.object({ nextCursor: z.string().nullable() }),
});

export const supportCreatedEnvelopeSchema = z.object({
  data: z.object({ conversation: supportConversationSchema }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const supportMessageEnvelopeSchema = z.object({
  data: z.object({ message: supportMessageSchema }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const supportReadEnvelopeSchema = z.object({
  data: z.object({
    conversationId: z.string(),
    readAt: z.string(),
    unreadCount: z.number().int().nonnegative(),
  }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const supportUnreadEnvelopeSchema = z.object({
  data: z.object({ count: z.number().int().nonnegative() }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type SupportConversationStatus = z.infer<typeof supportConversationStatusSchema>;
export type SupportConversation = z.infer<typeof supportConversationSchema>;
export type SupportMessage = z.infer<typeof supportMessageSchema>;

export interface CreateSupportConversationInput {
  subject: string;
  message: string;
  clientMessageId: string;
}

export const supportStatusLabels: Record<SupportConversationStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};
