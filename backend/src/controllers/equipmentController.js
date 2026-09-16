import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function list(_req, res, next) {
  try {
    const items = await prisma.equipment.findMany({
      orderBy: { inventoryCode: 'asc' },
      include: { laboratory: { select: { id: true, code: true, name: true } } },
    });
    return ok(res, items);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = String(req.params.id);
    const item = await prisma.equipment.findUnique({
      where: { id },
      include: { laboratory: true },
    });
    if (!item) return fail(res, 'Equipo no encontrado', 404);
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const lab = await prisma.laboratory.findUnique({ where: { id: req.body.laboratoryId } });
    if (!lab) return fail(res, 'El laboratorio indicado no existe', 400);

    const item = await prisma.equipment.create({
      data: req.body,
      include: { laboratory: { select: { id: true, code: true, name: true } } },
    });
    logger.info('Equipo creado', { id: item.id, by: req.user?.id });
    return ok(res, item, 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = String(req.params.id);
    if (req.body.laboratoryId) {
      const lab = await prisma.laboratory.findUnique({ where: { id: req.body.laboratoryId } });
      if (!lab) return fail(res, 'El laboratorio indicado no existe', 400);
    }
    const item = await prisma.equipment.update({
      where: { id },
      data: req.body,
      include: { laboratory: { select: { id: true, code: true, name: true } } },
    });
    logger.info('Equipo actualizado', { id, by: req.user?.id });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = String(req.params.id);
    const links = await prisma.reservationEquipment.count({ where: { equipmentId: id } });
    const incidents = await prisma.incident.count({ where: { equipmentId: id } });
    if (links > 0 || incidents > 0) {
      await prisma.equipment.update({ where: { id }, data: { status: 'MAINTENANCE' } });
      logger.info('Equipo marcado en mantenimiento', { id });
      return ok(res, { id, maintenance: true });
    }
    await prisma.equipment.delete({ where: { id } });
    logger.info('Equipo eliminado', { id, by: req.user?.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
