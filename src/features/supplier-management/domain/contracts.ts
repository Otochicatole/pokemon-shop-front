import { z } from 'zod';

const dateTime = z.string().datetime();

export const supplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  contactName: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
  version: z.number().int(),
  createdAt: dateTime,
  updatedAt: dateTime,
});

export const supplierListEnvelopeSchema = z.object({
  data: z.array(supplierSchema),
  meta: z.object({ nextCursor: z.string().nullable().optional() }),
});

export const supplierDetailEnvelopeSchema = z.object({
  data: z.object({ supplier: supplierSchema }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const supplierActiveEnvelopeSchema = z.object({
  data: z.object({ id: z.string().uuid(), active: z.boolean(), version: z.number().int() }),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(180),
  contactName: z.string().trim().max(120).optional(),
  email: z.union([z.literal(''), z.string().trim().email('Ingresá un email válido').max(254)]).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type Supplier = z.infer<typeof supplierSchema>;
export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
