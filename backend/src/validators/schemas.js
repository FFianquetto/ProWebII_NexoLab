import { z } from 'zod';
import { MAX_RESERVATION_MS, suggestEndFromStart, toHourStart } from '../utils/reservationTime.js';

const objectId = z.string().trim().min(1, 'Identificador requerido');

/** Validación de params en DELETE / GET-by-id / PUT */
export const idParamSchema = z.object({
  id: objectId,
});

export const registerSchema = z
  .object({
    email: z.string().email('Correo electrónico no válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
    fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
    role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
    studentId: z.string().max(50).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const role = data.role || 'STUDENT';
    if (role === 'STUDENT') {
      const id = (data.studentId || '').trim();
      if (!id) {
        ctx.addIssue({
          code: 'custom',
          message: 'La matrícula es obligatoria para alumnos',
          path: ['studentId'],
        });
      } else if (!/^\d{7}$/.test(id)) {
        ctx.addIssue({
          code: 'custom',
          message: 'La matrícula debe tener exactamente 7 números',
          path: ['studentId'],
        });
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const userUpdateSchema = z.object({
  email: z.string().email('Correo electrónico no válido').optional(),
  fullName: z.string().min(2).max(150).optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  studentId: z
    .string()
    .regex(/^\d{7}$/, 'La matrícula debe tener exactamente 7 números')
    .optional()
    .nullable(),
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
  capacity: z
    .number()
    .int()
    .min(20, 'La capacidad mínima es 20')
    .max(30, 'La capacidad máxima es 30'),
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
  userId: objectId.optional(),
  laboratoryId: objectId,
  subjectId: objectId.optional().nullable(),
  title: z
    .string()
    .trim()
    .min(2, 'El título debe tener al menos 2 caracteres')
    .max(150, 'El título es demasiado largo'),
  purpose: z.string().optional().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  attendees: z
    .number()
    .int()
    .min(1, 'Debe haber al menos 1 asistente')
    .max(30, 'No se puede reservar para más de 30 personas')
    .optional(),
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

export const reservationSchema = reservationBaseSchema
  .transform((data) => {
    // Normaliza siempre a hora en punto + duración fija 1h59 (evita rechazo por endsAt del cliente)
    const startsAt = toHourStart(data.startsAt);
    const endsAt = suggestEndFromStart(startsAt);
    return { ...data, startsAt, endsAt };
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endsAt'],
  })
  .refine((data) => data.endsAt.getTime() - data.startsAt.getTime() <= MAX_RESERVATION_MS, {
    message: 'Cada reserva dura como máximo 1 hora y 59 minutos',
    path: ['endsAt'],
  })
  .refine((data) => data.startsAt.getTime() >= Date.now() - 60_000, {
    message: 'No puedes solicitar un horario que ya pasó',
    path: ['startsAt'],
  });

export const reservationUpdateSchema = reservationBaseSchema.partial().superRefine((data, ctx) => {
  if (data.startsAt && data.endsAt) {
    if (data.endsAt <= data.startsAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'La hora de fin debe ser posterior a la de inicio',
        path: ['endsAt'],
      });
    } else if (data.endsAt.getTime() - data.startsAt.getTime() > MAX_RESERVATION_MS) {
      ctx.addIssue({
        code: 'custom',
        message: 'Cada reserva dura como máximo 1 hora y 59 minutos',
        path: ['endsAt'],
      });
    }
  }
  if (data.startsAt && data.startsAt.getTime() < Date.now() - 60_000) {
    ctx.addIssue({
      code: 'custom',
      message: 'No puedes solicitar un horario que ya pasó',
      path: ['startsAt'],
    });
  }
});

const reservationEquipmentBaseSchema = z.object({
  reservationId: objectId,
  equipmentId: objectId.optional(),
  category: z
    .enum(['Computadora', 'Casco VR', 'Bocina', 'Multímetro'], {
      message: 'Elige Computadora, Casco VR, Bocina o Multímetro',
    })
    .optional(),
  quantity: z.number().int().min(1).max(1).default(1),
});

export const reservationEquipmentSchema = reservationEquipmentBaseSchema.refine(
  (data) => Boolean(data.category || data.equipmentId),
  {
    message: 'Indica la categoría del equipo que quieres prestar',
    path: ['category'],
  },
);

export const reservationEquipmentUpdateSchema = reservationEquipmentBaseSchema.partial();

const incidentBaseSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().min(5),
  kind: z.enum(['LABORATORY', 'EQUIPMENT']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  laboratoryId: objectId.optional().nullable(),
  equipmentId: objectId.optional().nullable(),
  reportedById: objectId.optional(),
  resolvedAt: z.coerce.date().optional().nullable(),
});

export const incidentSchema = incidentBaseSchema.superRefine((data, ctx) => {
  const kind = data.kind || (data.equipmentId ? 'EQUIPMENT' : 'LABORATORY');
  if (kind === 'LABORATORY' && !data.laboratoryId) {
    ctx.addIssue({
      code: 'custom',
      message: 'Selecciona el laboratorio afectado',
      path: ['laboratoryId'],
    });
  }
  if (kind === 'EQUIPMENT' && !data.equipmentId) {
    ctx.addIssue({
      code: 'custom',
      message: 'Selecciona el equipo afectado',
      path: ['equipmentId'],
    });
  }
});

/** Zod v4 no permite .partial() sobre schemas con refinements */
export const incidentUpdateSchema = incidentBaseSchema.partial();

export const reportSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(150),
  type: z.enum(['GENERAL', 'INCIDENTS', 'OCCUPANCY', 'EQUIPMENT']).optional().default('GENERAL'),
  summary: z.string().min(5, 'El resumen debe tener al menos 5 caracteres'),
  notes: z.string().optional().nullable(),
  laboratoryId: objectId.optional().nullable(),
});

export const reportUpdateSchema = reportSchema.partial();
