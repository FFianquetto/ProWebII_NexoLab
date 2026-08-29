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
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
  });
}

export async function list(_req, res, next) {
  try {
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
    const id = Number(req.params.id);
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

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return fail(res, 'Usuario no válido', 400);

    const lab = await prisma.laboratory.findUnique({ where: { id: data.laboratoryId } });
    if (!lab) return fail(res, 'Laboratorio no válido', 400);
    if (lab.status !== 'AVAILABLE') return fail(res, 'El laboratorio no está disponible', 400);
    if (data.attendees > lab.capacity) {
      return fail(res, `Los asistentes exceden la capacidad (${lab.capacity})`, 400);
    }

    if (data.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject) return fail(res, 'Materia no válida', 400);
    }

    const conflict = await hasConflict(data.laboratoryId, data.startsAt, data.endsAt);
    if (conflict) {
      return fail(res, 'Hay un conflicto de horario en ese laboratorio', 409);
    }

    const item = await prisma.reservation.create({
      data: {
        ...data,
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

    logger.info('Reserva creada', { id: item.id, by: req.user?.id });
    return ok(res, item, 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { equipmentIds, ...data } = req.body;

    const current = await prisma.reservation.findUnique({ where: { id } });
    if (!current) return fail(res, 'Reserva no encontrada', 404);

    const laboratoryId = data.laboratoryId ?? current.laboratoryId;
    const startsAt = data.startsAt ?? current.startsAt;
    const endsAt = data.endsAt ?? current.endsAt;

    if (data.laboratoryId || data.startsAt || data.endsAt) {
      const conflict = await hasConflict(laboratoryId, startsAt, endsAt, id);
      if (conflict) return fail(res, 'Hay un conflicto de horario en ese laboratorio', 409);
    }

    const item = await prisma.$transaction(async (tx) => {
      if (equipmentIds) {
        await tx.reservationEquipment.deleteMany({ where: { reservationId: id } });
        if (equipmentIds.length) {
          await tx.reservationEquipment.createMany({
            data: equipmentIds.map((e) => ({
              reservationId: id,
              equipmentId: e.equipmentId,
              quantity: e.quantity || 1,
            })),
          });
        }
      }
      return tx.reservation.update({ where: { id }, data, include });
    });

    logger.info('Reserva actualizada', { id, by: req.user?.id });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    await prisma.reservation.delete({ where: { id } });
    logger.info('Reserva eliminada', { id, by: req.user?.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
