import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger, trackProcess } from '../utils/logger.js';

/** Categorías de préstamo individual (6 unidades c/u en el seed). */
export const LOAN_CATEGORIES = ['Computadora', 'Casco VR', 'Bocina', 'Multímetro'];

const include = {
  reservation: {
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      userId: true,
      laboratoryId: true,
      attendees: true,
      status: true,
      user: { select: { id: true, fullName: true, role: true } },
    },
  },
  equipment: {
    select: {
      id: true,
      inventoryCode: true,
      name: true,
      category: true,
      status: true,
      laboratoryId: true,
    },
  },
};

function isLoanCategory(category) {
  return LOAN_CATEGORIES.includes(String(category || ''));
}

/** Préstamo activo de una persona: reserva aún no termina (ventana ~2 h). */
async function findActivePersonLoan(userId, excludeAssignmentId = null) {
  const now = new Date();
  return prisma.reservationEquipment.findFirst({
    where: {
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
      reservation: {
        userId,
        endsAt: { gt: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    },
    include: {
      equipment: { select: { inventoryCode: true, name: true, category: true } },
      reservation: { select: { title: true, endsAt: true } },
    },
  });
}

/** Cuántos de una categoría están prestados en ventanas que se traslapan con la reserva. */
async function countCategoryInUseOverlapping(category, startsAt, endsAt, excludeAssignmentId = null) {
  const links = await prisma.reservationEquipment.findMany({
    where: {
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
      equipment: { category },
      reservation: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
      },
    },
    select: { id: true },
  });
  return links.length;
}

export async function list(req, res, next) {
  try {
    const actor = req.user;
    const items = await prisma.reservationEquipment.findMany({
      orderBy: { createdAt: 'desc' },
      include,
    });

    const filtered =
      actor.role === 'ADMIN'
        ? items
        : items.filter((i) => i.reservation?.userId === actor.id);

    return ok(res, filtered);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = String(req.params.id);
    const item = await prisma.reservationEquipment.findUnique({ where: { id }, include });
    if (!item) return fail(res, 'Asignación no encontrada', 404);
    if (req.user.role === 'STUDENT' && item.reservation?.userId !== req.user.id) {
      return fail(res, 'No tienes acceso a esta asignación.', 403);
    }
    if (req.user.role === 'TEACHER' && item.reservation?.userId !== req.user.id) {
      return fail(res, 'No tienes acceso a esta asignación.', 403);
    }
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

/** Disponibilidad por categoría (para el formulario del FE). */
export async function availability(req, res, next) {
  try {
    const reservationId = String(req.query.reservationId || '').trim();
    if (!reservationId) return fail(res, 'Indica reservationId.', 400);

    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return fail(res, 'Reserva no válida.', 400);

    const summary = [];
    for (const category of LOAN_CATEGORIES) {
      const total = await prisma.equipment.count({ where: { category } });
      const inUse = await countCategoryInUseOverlapping(
        category,
        reservation.startsAt,
        reservation.endsAt,
      );
      const available = Math.max(0, total - inUse);
      summary.push({ category, total, inUse, available });
    }

    return ok(res, summary);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  const process = trackProcess('equipo.asignar', { by: req.user?.id });
  try {
    const actor = req.user;
    const category = String(req.body.category || '').trim();
    let equipmentId = req.body.equipmentId ? String(req.body.equipmentId) : null;

    const reservation = await prisma.reservation.findUnique({
      where: { id: req.body.reservationId },
      include: { user: { select: { id: true, role: true, fullName: true } } },
    });
    if (!reservation) {
      process.end({ rejected: 'bad_reservation' });
      return fail(res, 'Reserva no válida', 400);
    }

    if ((actor.role === 'STUDENT' || actor.role === 'TEACHER') && reservation.userId !== actor.id) {
      process.end({ denied: true });
      return fail(res, 'Solo puedes asignar equipo a tus propias reservas.', 403);
    }

    if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
      process.end({ rejected: 'bad_status' });
      return fail(res, 'Solo se puede asignar equipo a reservas pendientes o confirmadas.', 400);
    }

    const now = new Date();
    if (new Date(reservation.endsAt) <= now) {
      process.end({ rejected: 'reservation_ended' });
      return fail(res, 'Esa reserva ya terminó. El préstamo dura como máximo ~2 horas.', 400);
    }

    const activeLoan = await findActivePersonLoan(reservation.userId);
    if (activeLoan) {
      process.end({ rejected: 'person_limit' });
      return fail(
        res,
        `Ya tienes un equipo en préstamo (${activeLoan.equipment?.name || 'equipo'}). Debes terminar ese tiempo (~2 h) antes de solicitar otro.`,
        400,
      );
    }

    // Ya tiene asignación en esta reserva
    const alreadyOnRes = await prisma.reservationEquipment.count({
      where: { reservationId: reservation.id },
    });
    if (alreadyOnRes >= 1) {
      process.end({ rejected: 'unit_limit' });
      return fail(res, 'Solo se permite 1 equipo por persona/reserva (préstamo individual).', 400);
    }

    let equipment = null;

    if (category) {
      if (!isLoanCategory(category)) {
        process.end({ rejected: 'bad_category' });
        return fail(
          res,
          `Categoría no válida. Elige: ${LOAN_CATEGORIES.join(', ')}.`,
          400,
        );
      }

      const inUse = await countCategoryInUseOverlapping(
        category,
        reservation.startsAt,
        reservation.endsAt,
      );
      const total = await prisma.equipment.count({ where: { category } });
      if (inUse >= total) {
        process.end({ rejected: 'category_full' });
        return fail(
          res,
          `No hay ${category} disponibles por el momento (las ${total} unidades ya están prestadas en ese horario).`,
          409,
        );
      }

      // Unidad libre: AVAILABLE y no asignada a reserva traslapada
      const candidates = await prisma.equipment.findMany({
        where: { category, status: 'AVAILABLE' },
        orderBy: { inventoryCode: 'asc' },
      });

      for (const cand of candidates) {
        const busy = await prisma.reservationEquipment.findFirst({
          where: {
            equipmentId: cand.id,
            reservation: {
              status: { in: ['PENDING', 'CONFIRMED'] },
              AND: [
                { startsAt: { lt: reservation.endsAt } },
                { endsAt: { gt: reservation.startsAt } },
              ],
            },
          },
        });
        if (!busy) {
          equipment = cand;
          break;
        }
      }

      if (!equipment) {
        process.end({ rejected: 'category_full' });
        return fail(
          res,
          `No hay ${category} disponibles por el momento.`,
          409,
        );
      }
    } else if (equipmentId) {
      equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
      if (!equipment) {
        process.end({ rejected: 'bad_equipment' });
        return fail(res, 'Equipo no válido', 400);
      }
      if (!isLoanCategory(equipment.category)) {
        process.end({ rejected: 'not_loan_category' });
        return fail(
          res,
          `Solo se prestan: ${LOAN_CATEGORIES.join(', ')}.`,
          400,
        );
      }
      if (equipment.status !== 'AVAILABLE') {
        process.end({ rejected: 'equipment_unavailable' });
        return fail(res, 'Ese equipo no está disponible.', 400);
      }
    } else {
      process.end({ rejected: 'missing_category' });
      return fail(res, 'Indica qué quieres prestar (categoría).', 400);
    }

    const item = await prisma.reservationEquipment.create({
      data: {
        reservationId: reservation.id,
        equipmentId: equipment.id,
        quantity: 1,
      },
      include,
    });

    await prisma.equipment.update({
      where: { id: equipment.id },
      data: { status: 'IN_USE' },
    });

    process.end({ id: item.id, category: equipment.category });
    logger.info('Equipo prestado (1 a 1)', {
      id: item.id,
      by: actor.id,
      category: equipment.category,
      equipmentId: equipment.id,
    });
    return ok(res, item, 201);
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}

export async function update(req, res, next) {
  const process = trackProcess('equipo.actualizar', { id: req.params.id, by: req.user?.id });
  try {
    // Los préstamos son 1 a 1; preferir eliminar y crear de nuevo
    process.end({ rejected: 'use_delete_create' });
    return fail(
      res,
      'Para cambiar de equipo, libera el préstamo actual y solicita otro (1 a 1).',
      400,
    );
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}

export async function remove(req, res, next) {
  const process = trackProcess('equipo.liberar', { id: req.params.id, by: req.user?.id });
  try {
    const id = String(req.params.id);
    const current = await prisma.reservationEquipment.findUnique({
      where: { id },
      include,
    });
    if (!current) {
      process.end({ notFound: true });
      return fail(res, 'Asignación no encontrada', 404);
    }

    if (req.user.role === 'STUDENT' && current.reservation?.userId !== req.user.id) {
      process.end({ denied: true });
      return fail(res, 'Solo puedes liberar tus propias asignaciones.', 403);
    }
    if (req.user.role === 'TEACHER' && current.reservation?.userId !== req.user.id) {
      process.end({ denied: true });
      return fail(res, 'Solo puedes liberar asignaciones de tus propias reservas.', 403);
    }

    await prisma.reservationEquipment.delete({ where: { id } });

    const stillAssigned = await prisma.reservationEquipment.count({
      where: { equipmentId: current.equipmentId },
    });
    if (stillAssigned === 0) {
      await prisma.equipment.update({
        where: { id: current.equipmentId },
        data: { status: 'AVAILABLE' },
      });
    }

    process.end({ deleted: true });
    return ok(res, { id, deleted: true });
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}
