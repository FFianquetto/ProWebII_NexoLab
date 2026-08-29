import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function list(_req, res, next) {
  try {
    const items = await prisma.subject.findMany({ orderBy: { code: 'asc' } });
    return ok(res, items);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.subject.findUnique({ where: { id } });
    if (!item) return fail(res, 'Materia no encontrada', 404);
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const item = await prisma.subject.create({ data: req.body });
    logger.info('Materia creada', { id: item.id, by: req.user?.id });
    return ok(res, item, 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.subject.update({ where: { id }, data: req.body });
    logger.info('Materia actualizada', { id, by: req.user?.id });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const linked = await prisma.reservation.count({ where: { subjectId: id } });
    if (linked > 0) {
      await prisma.subject.update({ where: { id }, data: { isActive: false } });
      logger.info('Materia desactivada', { id });
      return ok(res, { id, deactivated: true });
    }
    await prisma.subject.delete({ where: { id } });
    logger.info('Materia eliminada', { id, by: req.user?.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
