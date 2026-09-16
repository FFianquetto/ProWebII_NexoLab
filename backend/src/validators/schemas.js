import { z } from 'zod';

const objectId = z.string().trim().min(1, 'Identificador requerido');

export const registerSchema = z.object({
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  studentId: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const userUpdateSchema = z.object({
  email: z.string().email('Correo electrónico no válido').optional(),
  fullName: z.string().min(2).max(150).optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  studentId: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(72).optional(),
});

export const subjectSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(150),
  description: z.string().optional().nullable(),
  credits: z.number().int().min(0).max(30).optional(),
  isActive: z.boolean().optional(),
});

export const laboratorySchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(150),
  building: z.string().min(1).max(100),
  floor: z.string().max(20).optional().nullable(),
  capacity: z.number().int().min(1).max(500),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'CLOSED']).optional(),
  description: z.string().optional().nullable(),
});

export const equipmentSchema = z.object({
  inventoryCode: z.string().min(2).max(50),
  name: z.string().min(2).max(150),
  category: z.string().min(2).max(80),
  status: z.enum(['AVAILABLE', 'IN_USE', 'BROKEN', 'MAINTENANCE']).optional(),
  laboratoryId: objectId,
  notes: z.string().optional().nullable(),
});

export const reservationBaseSchema = z.object({
  userId: objectId,
  laboratoryId: objectId,
  subjectId: objectId.optional().nullable(),
  title: z.string().min(2).max(150),
  purpose: z.string().optional().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  attendees: z.number().int().min(1, 'Debe haber al menos 1 asistente').max(500).default(1),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  equipmentIds: z
    .array(
      z.object({
        equipmentId: objectId,
        quantity: z.number().int().min(1).default(1),
      }),
    )
    .optional(),
});

export const reservationSchema = reservationBaseSchema.refine(
  (data) => data.endsAt > data.startsAt,
  { message: 'endsAt debe ser posterior a startsAt', path: ['endsAt'] },
);

export const reservationUpdateSchema = reservationBaseSchema.partial();

export const reservationEquipmentSchema = z.object({
  reservationId: objectId,
  equipmentId: objectId,
  quantity: z.number().int().min(1).default(1),
});

export const incidentSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().min(5),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  laboratoryId: objectId.optional().nullable(),
  equipmentId: objectId.optional().nullable(),
  reportedById: objectId,
  resolvedAt: z.coerce.date().optional().nullable(),
});

export const reportSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(150),
  type: z.enum(['GENERAL', 'INCIDENTS', 'OCCUPANCY', 'EQUIPMENT']).optional().default('GENERAL'),
  summary: z.string().min(5, 'El resumen debe tener al menos 5 caracteres'),
  notes: z.string().optional().nullable(),
  laboratoryId: objectId.optional().nullable(),
});
