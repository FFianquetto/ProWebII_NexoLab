import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const include = {
  reservation: { select: { id: true, title: true, startsAt: true, endsAt: true } },
  equipment: { select: { id: true, inventoryCode: true, name: true } },
};

export async function list(_req, res, next) {
  try {
    const items = await prisma.reservationEquipment.findMany({
      orderBy: { id: 'asc' },
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
    const item = await prisma.reservationEquipment.findUnique({ where: { id }, include });
    if (!item) return fail(res, 'Asignación no encontrada', 404);
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.body.reservationId },
    });
    if (!reservation) return fail(res, 'Reserva no válida', 400);

    const equipment = await prisma.equipment.findUnique({
      where: { id: req.body.equipmentId },
    });
    if (!equipment) return fail(res, 'Equipo no válido', 400);

    const item = await prisma.reservationEquipment.create({ data: req.body, include });
    logger.info('Equipo asignado a reserva', { id: item.id, by: req.user?.id });
    return ok(res, item, 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.reservationEquipment.update({
      where: { id },
      data: req.body,
      include,
    });
    logger.info('Asignación actualizada', { id, by: req.user?.id });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    await prisma.reservationEquipment.delete({ where: { id } });
    logger.info('Asignación eliminada', { id, by: req.user?.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
