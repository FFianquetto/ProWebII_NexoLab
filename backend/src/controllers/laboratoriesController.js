import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function list(_req, res, next) {
  try {
    const items = await prisma.laboratory.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { equipment: true, reservations: true } },
      },
    });
    return ok(res, items);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = String(req.params.id);
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

// Alta de laboratorios: exclusiva del Administrador
export async function create(req, res, next) {
  try {
    const item = await prisma.laboratory.create({ data: req.body });
    logger.info('Laboratorio dado de alta por administrador', { id: item.id, by: req.user?.id });
    return ok(res, item, 201);
  } catch (error) {
    return next(error);
  }
}

// Modificación de laboratorios: exclusiva del Administrador
export async function update(req, res, next) {
  try {
    const id = String(req.params.id);
    const item = await prisma.laboratory.update({ where: { id }, data: req.body });
    logger.info('Laboratorio actualizado por administrador', { id, by: req.user?.id });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

// Baja de laboratorios: exclusiva del Administrador
export async function remove(req, res, next) {
  try {
    const id = String(req.params.id);
    const equipment = await prisma.equipment.count({ where: { laboratoryId: id } });
    const reservations = await prisma.reservation.count({ where: { laboratoryId: id } });

    // Si tiene reservas o equipos asociados, se da de baja marcándolo como CLOSED
    if (equipment > 0 || reservations > 0) {
      await prisma.laboratory.update({ where: { id }, data: { status: 'CLOSED' } });
      logger.info('Laboratorio dado de baja (estado CLOSED) por tener dependencias', { id, by: req.user?.id });
      return ok(res, { id, closed: true, message: 'Laboratorio dado de baja (marcado como CERRADO)' });
    }

    await prisma.laboratory.delete({ where: { id } });
    logger.info('Laboratorio eliminado por administrador', { id, by: req.user?.id });
    return ok(res, { id, deleted: true, message: 'Laboratorio eliminado permanentemente' });
  } catch (error) {
    return next(error);
  }
}
