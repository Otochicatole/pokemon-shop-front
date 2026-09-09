import { z } from 'zod';

export const adminSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.literal('SUPER_ADMIN'),
});
export type AdminIdentity = z.infer<typeof adminSchema>;

export const adminSessionEnvelopeSchema = z.object({
  data: z.object({ admin: adminSchema, csrfToken: z.string().optional() }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(1, 'Ingresá la contraseña'),
}).strict();
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
