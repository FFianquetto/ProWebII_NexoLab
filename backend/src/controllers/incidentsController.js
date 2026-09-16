import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const include = {
  laboratory: { select: { id: true, code: true, name: true } },
  equipment: { select: { id: true, inventoryCode: true, name: true } },
  reportedBy: { select: { id: true, fullName: true, email: true, role: true } },
};

export async function list(_req, res, next) {
  try {
    const items = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
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
    const item = await prisma.incident.findUnique({ where: { id }, include });
    if (!item) return fail(res, 'Incidencia no encontrada', 404);
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const reporter = await prisma.user.findUnique({ where: { id: req.body.reportedById } });
    if (!reporter) return fail(res, 'Reportante no válido', 400);

    if (req.body.laboratoryId) {
      const lab = await prisma.laboratory.findUnique({ where: { id: req.body.laboratoryId } });
      if (!lab) return fail(res, 'Laboratorio no válido', 400);
    }
    if (req.body.equipmentId) {
      const eq = await prisma.equipment.findUnique({ where: { id: req.body.equipmentId } });
      if (!eq) return fail(res, 'Equipo no válido', 400);
    }

    const data = { ...req.body };
    if (['RESOLVED', 'CLOSED'].includes(data.status) && !data.resolvedAt) {
      data.resolvedAt = new Date();
    }

    const item = await prisma.incident.create({ data, include });
    logger.info('Incidencia creada', { id: item.id, by: req.user?.id });
    return ok(res, item, 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = String(req.params.id);
    const data = { ...req.body };
    if (['RESOLVED', 'CLOSED'].includes(data.status) && data.resolvedAt === undefined) {
      data.resolvedAt = new Date();
    }
    const item = await prisma.incident.update({ where: { id }, data, include });
    logger.info('Incidencia actualizada', { id, by: req.user?.id });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = String(req.params.id);
    await prisma.incident.delete({ where: { id } });
    logger.info('Incidencia eliminada', { id, by: req.user?.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
