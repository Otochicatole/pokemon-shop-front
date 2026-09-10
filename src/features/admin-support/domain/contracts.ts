import { z } from 'zod';

export const supportConversationStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
]);

export type SupportConversationStatus = z.infer<typeof supportConversationStatusSchema>;

export const supportSenderTypeSchema = z.enum(['USER', 'ADMIN']);
export type SupportSenderType = z.infer<typeof supportSenderTypeSchema>;

export const adminSupportMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderType: supportSenderTypeSchema,
  sender: z.object({
    id: z.string(),
    name: z.string().nullable(),
  }),
  content: z.string(),
  createdAt: z.string(),
});

export type AdminSupportMessage = z.infer<typeof adminSupportMessageSchema>;

export const adminSupportConversationSchema = z.object({
  id: z.string(),
  status: supportConversationStatusSchema,
  subject: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().email(),
  }),
  createdByType: supportSenderTypeSchema,
  lastMessageAt: z.string(),
  lastMessagePreview: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  unreadCount: z.number().int().nonnegative(),
});

export type AdminSupportConversation = z.infer<typeof adminSupportConversationSchema>;

const cursorMetaSchema = z.object({ nextCursor: z.string().nullable() }).passthrough();

export const adminSupportConversationListEnvelopeSchema = z.object({
  data: z.array(adminSupportConversationSchema),
  meta: cursorMetaSchema,
});

export const adminSupportConversationDetailEnvelopeSchema = z.object({
  data: z.object({
    conversation: adminSupportConversationSchema,
    messages: z.array(adminSupportMessageSchema),
  }),
  meta: cursorMetaSchema,
});

export const adminSupportConversationEnvelopeSchema = z.object({
  data: z.object({ conversation: adminSupportConversationSchema }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const adminSupportMessageEnvelopeSchema = z.object({
  data: z.object({ message: adminSupportMessageSchema }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const adminSupportReadEnvelopeSchema = z.object({
  data: z.object({
    conversationId: z.string(),
    readAt: z.string(),
    unreadCount: z.number().int().nonnegative(),
  }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const adminSupportUnreadEnvelopeSchema = z.object({
  data: z.object({ count: z.number().int().nonnegative() }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export interface CreateAdminSupportConversationInput {
  userId: string;
  subject: string;
  message: string;
  clientMessageId: string;
}
