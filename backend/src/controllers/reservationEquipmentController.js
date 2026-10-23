import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger, trackProcess } from '../utils/logger.js';

/** Categorías de préstamo individual (6 unidades c/u en el seed). */
export const LOAN_CATEGORIES = ['Computadora', 'Casco VR', 'Bocina', 'Multímetro'];

/** Duración de un préstamo directo (sin reserva): 2 h desde que se solicita. */
export const LOAN_DURATION_MS = 2 * 60 * 60 * 1000;

const include = {
  user: { select: { id: true, fullName: true, role: true } },
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

/** Ventana de un préstamo directo: ahora → ahora + 2 h. */
function directLoanWindow() {
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + LOAN_DURATION_MS);
  return { startsAt, endsAt };
}

/** Préstamo activo de una persona: su ventana aún no termina. */
async function findActivePersonLoan(userId, excludeLoanId = null) {
  const now = new Date();
  return prisma.reservationEquipment.findFirst({
    where: {
      ...(excludeLoanId ? { id: { not: excludeLoanId } } : {}),
      userId,
      endsAt: { gt: now },
    },
    include: {
      equipment: { select: { inventoryCode: true, name: true, category: true } },
    },
  });
}

/** Préstamos de un equipo que se traslapan con la ventana dada. */
function overlappingLoanWhere(startsAt, endsAt, excludeLoanId = null) {
  return {
    ...(excludeLoanId ? { id: { not: excludeLoanId } } : {}),
    AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
  };
}

/** Cuántos de una categoría están prestados en ventanas que se traslapan. */
async function countCategoryInUseOverlapping(category, startsAt, endsAt, excludeLoanId = null) {
  return prisma.reservationEquipment.count({
    where: {
      ...overlappingLoanWhere(startsAt, endsAt, excludeLoanId),
      equipment: { category },
    },
  });
}

/**
 * Resuelve la ventana del préstamo y el usuario dueño.
 * - Sin reserva: préstamo directo de 2 h desde ahora, a nombre del actor.
 * - Con reserva (opcional): usa el horario de la reserva; debe ser propia (salvo ADMIN),
 *   estar pendiente/confirmada y no haber terminado.
 */
async function resolveLoanWindow(actor, reservationId) {
  if (!reservationId) {
    return { ...directLoanWindow(), userId: actor.id, reservation: null };
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: String(reservationId) },
    include: { user: { select: { id: true, role: true, fullName: true } } },
  });
  if (!reservation) return { error: ['Reserva no válida', 400, 'bad_reservation'] };

  if (actor.role !== 'ADMIN' && reservation.userId !== actor.id) {
    return { error: ['Solo puedes ligar el préstamo a tus propias reservas.', 403, 'denied'] };
  }
  if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
    return {
      error: ['Solo se puede ligar equipo a reservas pendientes o confirmadas.', 400, 'bad_status'],
    };
  }
  if (new Date(reservation.endsAt) <= new Date()) {
    return { error: ['Esa reserva ya terminó.', 400, 'reservation_ended'] };
  }

  return {
    startsAt: new Date(reservation.startsAt),
    endsAt: new Date(reservation.endsAt),
    userId: reservation.userId,
    reservation,
  };
}

export async function list(req, res, next) {
  try {
    const actor = req.user;
    const items = await prisma.reservationEquipment.findMany({
      orderBy: { createdAt: 'desc' },
      include,
    });

    const filtered = actor.role === 'ADMIN' ? items : items.filter((i) => i.userId === actor.id);

    return ok(res, filtered);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = String(req.params.id);
    const item = await prisma.reservationEquipment.findUnique({ where: { id }, include });
    if (!item) return fail(res, 'Préstamo no encontrado', 404);
    if (req.user.role !== 'ADMIN' && item.userId !== req.user.id) {
      return fail(res, 'No tienes acceso a este préstamo.', 403);
    }
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

/** Disponibilidad por categoría (para el formulario del FE). reservationId es opcional. */
export async function availability(req, res, next) {
  try {
    const reservationId = String(req.query.reservationId || '').trim();
    const win = await resolveLoanWindow(req.user, reservationId || null);
    if (win.error) return fail(res, win.error[0], win.error[1]);

    const summary = [];
    for (const category of LOAN_CATEGORIES) {
      const total = await prisma.equipment.count({
        where: { category, status: { notIn: ['MAINTENANCE', 'BROKEN'] } },
      });
      const inUse = await countCategoryInUseOverlapping(category, win.startsAt, win.endsAt);
      const available = Math.max(0, total - inUse);
      summary.push({ category, total, inUse, available });
    }

    return ok(res, {
      startsAt: win.startsAt,
      endsAt: win.endsAt,
      categories: summary,
    });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  const process = trackProcess('equipo.prestar', { by: req.user?.id });
  try {
    const actor = req.user;
    const category = String(req.body.category || '').trim();
    const equipmentId = req.body.equipmentId ? String(req.body.equipmentId) : null;
    const reservationId = req.body.reservationId ? String(req.body.reservationId) : null;

    const win = await resolveLoanWindow(actor, reservationId);
    if (win.error) {
      process.end({ rejected: win.error[2] });
      return fail(res, win.error[0], win.error[1]);
    }
    const { startsAt, endsAt, userId } = win;

    // Regla: 1 equipo por persona a la vez (~2 h)
    const activeLoan = await findActivePersonLoan(userId);
    if (activeLoan) {
      process.end({ rejected: 'person_limit' });
      return fail(
        res,
        `Ya tienes un equipo en préstamo (${activeLoan.equipment?.name || 'equipo'}). Debes terminar ese tiempo (~2 h) o liberarlo antes de solicitar otro.`,
        400,
      );
    }

    let equipment = null;

    if (category) {
      if (!isLoanCategory(category)) {
        process.end({ rejected: 'bad_category' });
        return fail(res, `Categoría no válida. Elige: ${LOAN_CATEGORIES.join(', ')}.`, 400);
      }

      const total = await prisma.equipment.count({
        where: { category, status: { notIn: ['MAINTENANCE', 'BROKEN'] } },
      });
      const inUse = await countCategoryInUseOverlapping(category, startsAt, endsAt);
      if (total === 0 || inUse >= total) {
        process.end({ rejected: 'category_full' });
        return fail(
          res,
          `No hay ${category} disponibles por el momento (las ${total} unidades ya están prestadas en ese horario).`,
          409,
        );
      }

      // Unidad libre: no está en mantenimiento/dañada y no tiene préstamo traslapado
      const candidates = await prisma.equipment.findMany({
        where: { category, status: { notIn: ['MAINTENANCE', 'BROKEN'] } },
        orderBy: { inventoryCode: 'asc' },
      });

      for (const cand of candidates) {
        const busy = await prisma.reservationEquipment.findFirst({
          where: { equipmentId: cand.id, ...overlappingLoanWhere(startsAt, endsAt) },
          select: { id: true },
        });
        if (!busy) {
          equipment = cand;
          break;
        }
      }

      if (!equipment) {
        process.end({ rejected: 'category_full' });
        return fail(res, `No hay ${category} disponibles por el momento.`, 409);
      }
    } else if (equipmentId) {
      equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
      if (!equipment) {
        process.end({ rejected: 'bad_equipment' });
        return fail(res, 'Equipo no válido', 400);
      }
      if (!isLoanCategory(equipment.category)) {
        process.end({ rejected: 'not_loan_category' });
        return fail(res, `Solo se prestan: ${LOAN_CATEGORIES.join(', ')}.`, 400);
      }
      if (['MAINTENANCE', 'BROKEN'].includes(equipment.status)) {
        process.end({ rejected: 'equipment_unavailable' });
        return fail(res, 'Ese equipo no está disponible.', 400);
      }
      const busy = await prisma.reservationEquipment.findFirst({
        where: { equipmentId: equipment.id, ...overlappingLoanWhere(startsAt, endsAt) },
        select: { id: true },
      });
      if (busy) {
        process.end({ rejected: 'equipment_busy' });
        return fail(res, 'Ese equipo ya está prestado en ese horario.', 409);
      }
    } else {
      process.end({ rejected: 'missing_category' });
      return fail(res, 'Indica qué quieres prestar (categoría).', 400);
    }

    const item = await prisma.reservationEquipment.create({
      data: {
        userId,
        equipmentId: equipment.id,
        reservationId: win.reservation ? win.reservation.id : null,
        quantity: 1,
        startsAt,
        endsAt,
      },
      include,
    });

    // Si el préstamo ya está corriendo, marcar el equipo como en uso
    if (startsAt <= new Date()) {
      await prisma.equipment.update({
        where: { id: equipment.id },
        data: { status: 'IN_USE' },
      });
    }

    process.end({ id: item.id, category: equipment.category, direct: !win.reservation });
    logger.info('Equipo prestado (1 a 1)', {
      id: item.id,
      by: actor.id,
      userId,
      category: equipment.category,
      equipmentId: equipment.id,
      direct: !win.reservation,
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
      return fail(res, 'Préstamo no encontrado', 404);
    }

    if (req.user.role !== 'ADMIN' && current.userId !== req.user.id) {
      process.end({ denied: true });
      return fail(res, 'Solo puedes liberar tus propios préstamos.', 403);
    }

    await prisma.reservationEquipment.delete({ where: { id } });

    // Si el equipo ya no tiene préstamos vigentes, vuelve a estar disponible
    const now = new Date();
    const stillActive = await prisma.reservationEquipment.count({
      where: { equipmentId: current.equipmentId, endsAt: { gt: now } },
    });
    if (stillActive === 0) {
      await prisma.equipment.updateMany({
        where: { id: current.equipmentId, status: 'IN_USE' },
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
