import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const include = {
  user: { select: { id: true, fullName: true, email: true, role: true } },
  laboratory: { select: { id: true, code: true, name: true, capacity: true } },
  subject: { select: { id: true, code: true, name: true } },
  reservationEquipment: {
    include: { equipment: { select: { id: true, inventoryCode: true, name: true } } },
  },
};

async function hasConflict(laboratoryId, startsAt, endsAt, excludeId = null) {
  return prisma.reservation.findFirst({
    where: {
      laboratoryId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      AND: [{ startsAt: { lt: new Date(endsAt) } }, { endsAt: { gt: new Date(startsAt) } }],
    },
  });
}

export async function list(req, res, next) {
  try {
    // Alumnos solo ven sus reservas o todas en modo lectura, pero filtramos si se requiere
    const items = await prisma.reservation.findMany({
      orderBy: { startsAt: 'desc' },
      include,
    });
    return ok(res, items);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = String(req.params.id);
    const item = await prisma.reservation.findUnique({ where: { id }, include });
    if (!item) return fail(res, 'Reserva no encontrada', 404);
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const { equipmentIds = [], ...data } = req.body;
    const attendees = Number(data.attendees || 1);

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return fail(res, 'Usuario solicitante no válido', 400);

    // REGLA DE NEGOCIO:
    // Alumnos sólo pueden apartar laboratorios cuando existan al menos 10 solicitantes/asistentes.
    // Maestros pueden apartar con un solo maestro (attendees >= 1).
    // Administrador sólo lleva el control y no se reserva a sí mismo.
    if (user.role === 'STUDENT') {
      if (attendees < 10) {
        return fail(
          res,
          'Para el caso de alumnos, los salones/laboratorios sólo se pueden apartar cuando existan al menos 10 solicitantes.',
          400,
        );
      }
    } else if (user.role === 'ADMIN') {
      return fail(
        res,
        'El administrador se encarga únicamente de llevar el control y de dar de alta o baja laboratorios. La reserva debe ser solicitada a nombre de un maestro o de un grupo de alumnos (mínimo 10).',
        400,
      );
    }

    const lab = await prisma.laboratory.findUnique({ where: { id: data.laboratoryId } });
    if (!lab) return fail(res, 'Laboratorio no válido', 400);
    if (lab.status !== 'AVAILABLE') return fail(res, 'El laboratorio no está disponible', 400);
    if (attendees > lab.capacity) {
      return fail(res, `Los asistentes (${attendees}) exceden la capacidad del laboratorio (${lab.capacity})`, 400);
    }

    if (data.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject) return fail(res, 'Materia no válida', 400);
    }

    const conflict = await hasConflict(data.laboratoryId, data.startsAt, data.endsAt);
    if (conflict) {
      return fail(res, 'Hay un conflicto de horario en ese laboratorio para el rango seleccionado', 409);
    }

    const item = await prisma.reservation.create({
      data: {
        userId: data.userId,
        laboratoryId: data.laboratoryId,
        subjectId: data.subjectId || null,
        title: data.title,
        purpose: data.purpose || null,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        attendees,
        status: data.status || 'PENDING',
        reservationEquipment: equipmentIds.length
          ? {
              create: equipmentIds.map((e) => ({
                equipmentId: e.equipmentId,
                quantity: e.quantity || 1,
              })),
            }
          : undefined,
      },
      include,
    });

    logger.info('Reserva creada', { id: item.id, by: req.user?.id, attendees });
    return ok(res, item, 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = String(req.params.id);
    const { equipmentIds, ...data } = req.body;

    const current = await prisma.reservation.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!current) return fail(res, 'Reserva no encontrada', 404);

    const targetUserId = data.userId ?? current.userId;
    const targetUser =
      targetUserId === current.userId
        ? current.user
        : await prisma.user.findUnique({ where: { id: targetUserId } });

    if (!targetUser) return fail(res, 'Usuario solicitante no válido', 400);

    const attendees = data.attendees !== undefined ? Number(data.attendees) : current.attendees;

    // Validación de regla de negocio en edición
    if (targetUser.role === 'STUDENT' && attendees < 10) {
      return fail(
        res,
        'Para el caso de alumnos, los salones/laboratorios sólo se pueden apartar cuando existan al menos 10 solicitantes.',
        400,
      );
    }

    const laboratoryId = data.laboratoryId ?? current.laboratoryId;
    const startsAt = data.startsAt ? new Date(data.startsAt) : current.startsAt;
    const endsAt = data.endsAt ? new Date(data.endsAt) : current.endsAt;

    if (data.laboratoryId || data.startsAt || data.endsAt) {
      const conflict = await hasConflict(laboratoryId, startsAt, endsAt, id);
      if (conflict) return fail(res, 'Hay un conflicto de horario en ese laboratorio', 409);
    }

    const updateData = {
      ...data,
      ...(data.startsAt ? { startsAt: new Date(data.startsAt) } : {}),
      ...(data.endsAt ? { endsAt: new Date(data.endsAt) } : {}),
      ...(data.attendees !== undefined ? { attendees } : {}),
    };

    if (equipmentIds) {
      await prisma.reservationEquipment.deleteMany({ where: { reservationId: id } });
      if (equipmentIds.length) {
        for (const eq of equipmentIds) {
          await prisma.reservationEquipment.create({
            data: {
              reservationId: id,
              equipmentId: eq.equipmentId,
              quantity: eq.quantity || 1,
            },
          });
        }
      }
    }

    const item = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include,
    });

    logger.info('Reserva actualizada', { id, by: req.user?.id });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = String(req.params.id);
    await prisma.reservationEquipment.deleteMany({ where: { reservationId: id } });
    await prisma.reservation.delete({ where: { id } });
    logger.info('Reserva eliminada', { id, by: req.user?.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
