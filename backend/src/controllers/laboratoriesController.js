import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function list(_req, res, next) {
  try {
    const items = await prisma.laboratory.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { equipment: true, reservations: true } } },
    });
    return ok(res, items);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.laboratory.findUnique({
      where: { id },
      include: { equipment: true },
    });
    if (!item) return fail(res, 'Laboratorio no encontrado', 404);
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const item = await prisma.laboratory.create({ data: req.body });
    logger.info('Laboratorio creado', { id: item.id, by: req.user?.id });
    return ok(res, item, 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.laboratory.update({ where: { id }, data: req.body });
    logger.info('Laboratorio actualizado', { id, by: req.user?.id });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const equipment = await prisma.equipment.count({ where: { laboratoryId: id } });
    const reservations = await prisma.reservation.count({ where: { laboratoryId: id } });
    if (equipment > 0 || reservations > 0) {
      await prisma.laboratory.update({ where: { id }, data: { status: 'CLOSED' } });
      logger.info('Laboratorio cerrado (tiene relaciones)', { id });
      return ok(res, { id, closed: true });
    }
    await prisma.laboratory.delete({ where: { id } });
    logger.info('Laboratorio eliminado', { id, by: req.user?.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
