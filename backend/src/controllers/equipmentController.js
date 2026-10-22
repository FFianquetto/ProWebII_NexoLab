import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/** Inventario de préstamo (coincide con seed: 6×4 = 24). */
export const LOAN_CATEGORIES = ['Computadora', 'Casco VR', 'Bocina', 'Multímetro'];

const EQUIPMENT_STATUS_ORDER = {
  AVAILABLE: 0,
  IN_USE: 1,
  MAINTENANCE: 2,
  BROKEN: 3,
};

export async function list(req, res, next) {
  try {
    const category = String(req.query.category || '').trim();
    const where = {
      category: LOAN_CATEGORIES.includes(category)
        ? category
        : { in: LOAN_CATEGORIES },
    };

    const items = await prisma.equipment.findMany({
      where,
      orderBy: { inventoryCode: 'asc' },
      include: { laboratory: { select: { id: true, code: true, name: true } } },
    });

    const now = new Date();
    const enriched = await Promise.all(
      items.map(async (item) => {
        const activeLoan = await prisma.reservationEquipment.findFirst({
          where: {
            equipmentId: item.id,
            reservation: {
              status: { in: ['PENDING', 'CONFIRMED'] },
              endsAt: { gt: now },
            },
          },
          select: { id: true },
        });
        const inUse = item.status === 'IN_USE' || Boolean(activeLoan);
        return { ...item, inUse };
      }),
    );

    enriched.sort((a, b) => {
      const byStatus =
        (EQUIPMENT_STATUS_ORDER[a.status] ?? 99) - (EQUIPMENT_STATUS_ORDER[b.status] ?? 99);
      if (byStatus !== 0) return byStatus;
      return String(a.inventoryCode).localeCompare(String(b.inventoryCode));
    });

    return ok(res, enriched);
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
    const data = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.inventoryCode !== undefined) data.inventoryCode = req.body.inventoryCode;
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.category !== undefined) data.category = req.body.category;
    if (req.body.notes !== undefined) data.notes = req.body.notes;
    if (req.body.laboratoryId !== undefined) {
      const lab = await prisma.laboratory.findUnique({ where: { id: req.body.laboratoryId } });
      if (!lab) return fail(res, 'El laboratorio indicado no existe', 400);
      data.laboratoryId = req.body.laboratoryId;
    }

    if (!Object.keys(data).length) {
      return fail(res, 'No hay campos para actualizar.', 400);
    }

    if (data.status === 'MAINTENANCE') {
      const existing = await prisma.equipment.findUnique({ where: { id } });
      if (!existing) return fail(res, 'Equipo no encontrado', 404);

      const now = new Date();
      const activeLoan = await prisma.reservationEquipment.findFirst({
        where: {
          equipmentId: id,
          reservation: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            endsAt: { gt: now },
          },
        },
        include: {
          reservation: { select: { endsAt: true, title: true } },
        },
      });

      if (existing.status === 'IN_USE' || activeLoan) {
        return fail(
          res,
          `No se puede poner en mantenimiento "${existing.name}": está en uso. Espera a que termine el préstamo.`,
          409,
        );
      }
    }

    const item = await prisma.equipment.update({
      where: { id },
      data,
      include: { laboratory: { select: { id: true, code: true, name: true } } },
    });
    logger.info('Equipo actualizado', { id, status: item.status, by: req.user?.id });
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
