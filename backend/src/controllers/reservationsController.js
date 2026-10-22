import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { trackProcess } from '../utils/logger.js';
import {
  clearSeconds,
  suggestEndFromStart,
  toHourStart,
  validateReservationWindow,
} from '../utils/reservationTime.js';

const STUDENT_GROUP_MIN = 5;
/** Tope general de personas por reserva (maestros y grupos de alumnos). */
const MAX_ATTENDEES = 30;

function maxPeopleForLab(labCapacity) {
  return Math.min(MAX_ATTENDEES, Number(labCapacity) || MAX_ATTENDEES);
}

const include = {
  user: { select: { id: true, fullName: true, email: true, role: true } },
  laboratory: { select: { id: true, code: true, name: true, capacity: true } },
  subject: { select: { id: true, code: true, name: true } },
  reservationEquipment: {
    include: { equipment: { select: { id: true, inventoryCode: true, name: true } } },
  },
};

async function hasConflict(laboratoryId, startsAt, endsAt, excludeId = null) {
  // Confirmadas + pendientes de maestro ocupan el lab
  return prisma.reservation.findFirst({
    where: {
      laboratoryId,
      OR: [
        { status: 'CONFIRMED' },
        { status: 'PENDING', user: { role: 'TEACHER' } },
      ],
      ...(excludeId ? { id: { not: excludeId } } : {}),
      AND: [{ startsAt: { lt: new Date(endsAt) } }, { endsAt: { gt: new Date(startsAt) } }],
    },
    include: {
      user: { select: { fullName: true, role: true } },
      laboratory: { select: { code: true, name: true } },
    },
  });
}

function conflictMessage(conflict) {
  if (!conflict) return 'Hay un conflicto de horario en ese laboratorio.';
  const when = new Date(conflict.startsAt).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const who = conflict.user?.fullName || 'otro usuario';
  const lab = conflict.laboratory?.code || 'El laboratorio';
  return `${lab} ya está reservado en ese horario (${who} · desde ${when}). Elige otro laboratorio u otro horario.`;
}

/** Solicitudes de alumnos (PENDING) al mismo lab con horario traslapado. */
async function findStudentGroupRequests(laboratoryId, startsAt, endsAt, excludeUserId = null) {
  return prisma.reservation.findMany({
    where: {
      laboratoryId,
      status: 'PENDING',
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      user: { role: 'STUDENT' },
      AND: [{ startsAt: { lt: new Date(endsAt) } }, { endsAt: { gt: new Date(startsAt) } }],
    },
    include: { user: { select: { id: true, fullName: true, role: true } } },
  });
}

async function releaseEquipmentFromReservation(reservationId) {
  const links = await prisma.reservationEquipment.findMany({
    where: { reservationId },
    select: { equipmentId: true },
  });
  await prisma.reservationEquipment.deleteMany({ where: { reservationId } });

  for (const { equipmentId } of links) {
    const stillAssigned = await prisma.reservationEquipment.count({ where: { equipmentId } });
    if (stillAssigned === 0) {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: { status: 'AVAILABLE' },
      });
    }
  }
}

export async function list(req, res, next) {
  try {
    const actor = req.user;
    const items = await prisma.reservation.findMany({
      where: actor.role === 'ADMIN' ? undefined : { userId: actor.id },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'asc' }],
      include,
    });

    // Alumnos: adjuntar cuántos han solicitado el mismo lab/horario
    // y quién inició la solicitud (el primero que reservó).
    // Admin: 1 fila por lab+horario (no listar a cada alumno del grupo).
    const enriched = [];
    const seenStudentSlots = new Set();

    for (const item of items) {
      if (item.user?.role !== 'STUDENT') {
        enriched.push({
          ...item,
          reservedBy: item.user
            ? { id: item.user.id, fullName: item.user.fullName, role: item.user.role }
            : null,
        });
        continue;
      }

      const peers = await prisma.reservation.findMany({
        where: {
          laboratoryId: item.laboratoryId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          user: { role: 'STUDENT' },
          AND: [
            { startsAt: { lt: item.endsAt } },
            { endsAt: { gt: item.startsAt } },
          ],
        },
        include: { user: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      });

      const first = peers[0] || item;
      const slotKey = `${item.laboratoryId}|${new Date(first.startsAt).toISOString().slice(0, 13)}`;

      if (actor.role === 'ADMIN') {
        if (seenStudentSlots.has(slotKey)) continue;
        seenStudentSlots.add(slotKey);
      }

      enriched.push({
        ...item,
        // Representante del slot: título y datos del primero que reservó
        id: actor.role === 'ADMIN' ? first.id : item.id,
        title: first.title || item.title,
        userId: first.userId || item.userId,
        user: first.user || item.user,
        startsAt: first.startsAt,
        endsAt: first.endsAt,
        status: peers.some((p) => p.status === 'CONFIRMED') ? 'CONFIRMED' : item.status,
        attendees: peers.length,
        groupCount: peers.length,
        reservedBy: first.user
          ? { id: first.user.id, fullName: first.user.fullName, role: first.user.role }
          : item.user
            ? { id: item.user.id, fullName: item.user.fullName, role: item.user.role }
            : null,
      });
    }

    return ok(res, enriched);
  } catch (error) {
    return next(error);
  }
}

/**
 * Horarios ocupados de un lab en un día (para deshabilitar horas en el picker).
 * Query: laboratoryId, day=YYYY-MM-DD, excludeId? (al editar)
 */
export async function busySlots(req, res, next) {
  try {
    const laboratoryId = String(req.query.laboratoryId || '').trim();
    const day = String(req.query.day || '').trim();
    const excludeId = req.query.excludeId ? String(req.query.excludeId) : null;

    if (!laboratoryId || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return fail(res, 'Indica laboratoryId y day (YYYY-MM-DD).', 400);
    }

    const [y, m, d] = day.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

    const actor = req.user;
    // Alumnos: solo maestros bloquean el horario (pueden unirse a grupos).
    // Maestro/admin: cualquier confirmada ocupa el slot.
    const occupyFilter =
      actor?.role === 'STUDENT'
        ? [
            { status: 'CONFIRMED', user: { role: 'TEACHER' } },
            { status: 'PENDING', user: { role: 'TEACHER' } },
          ]
        : [
            { status: 'CONFIRMED' },
            { status: 'PENDING', user: { role: 'TEACHER' } },
          ];

    const items = await prisma.reservation.findMany({
      where: {
        laboratoryId,
        OR: occupyFilter,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        AND: [{ startsAt: { lt: dayEnd } }, { endsAt: { gt: dayStart } }],
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        title: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    return ok(res, items);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = String(req.params.id);
    const actor = req.user;
    const item = await prisma.reservation.findUnique({ where: { id }, include });
    if (!item) return fail(res, 'Reserva no encontrada', 404);
    if (actor.role !== 'ADMIN' && item.userId !== actor.id) {
      return fail(res, 'No tienes acceso a esta reserva.', 403);
    }
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  const process = trackProcess('reservas.create', { by: req.user?.id });
  try {
    const { equipmentIds = [], ...data } = req.body;
    const actor = req.user;

    if (actor.role === 'ADMIN') {
      process.end({ rejected: 'admin_cannot_reserve' });
      return fail(
        res,
        'El administrador no solicita laboratorios. Usa una cuenta de maestro o de alumno.',
        403,
      );
    }

    // El solicitante siempre es quien inicia sesión (evita suplantar roles)
    const userId = actor.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      process.end({ rejected: 'invalid_user' });
      return fail(res, 'Usuario solicitante no válido', 400);
    }

    const lab = await prisma.laboratory.findUnique({ where: { id: data.laboratoryId } });
    if (!lab) {
      process.end({ rejected: 'invalid_lab' });
      return fail(res, 'Laboratorio no válido', 400);
    }
    if (lab.status !== 'AVAILABLE') {
      process.end({ rejected: 'lab_unavailable' });
      return fail(res, 'El laboratorio no está disponible', 400);
    }

    if (data.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject) {
        process.end({ rejected: 'invalid_subject' });
        return fail(res, 'Materia no válida', 400);
      }
    }

    const startsAt = toHourStart(new Date(data.startsAt));
    const endsAt = suggestEndFromStart(startsAt);

    const timeError = validateReservationWindow(startsAt, endsAt, { requireFutureStart: true });
    if (timeError) {
      process.end({ rejected: 'invalid_time_window' });
      return fail(res, timeError, 400);
    }

    // ——— MAESTRO: reserva directa, él define asistentes ———
    if (user.role === 'TEACHER') {
      const attendees = Number(data.attendees || 1);
      const maxPeople = maxPeopleForLab(lab.capacity);
      if (attendees < 1) {
        process.end({ rejected: 'bad_attendees' });
        return fail(res, 'Debes indicar al menos 1 asistente.', 400);
      }
      if (attendees > maxPeople) {
        process.end({ rejected: 'over_capacity' });
        return fail(
          res,
          `Este laboratorio admite máximo ${maxPeople} personas (capacidad del lab: ${lab.capacity}).`,
          400,
        );
      }

      const conflict = await hasConflict(data.laboratoryId, startsAt, endsAt);
      if (conflict) {
        process.end({ rejected: 'schedule_conflict' });
        return fail(res, conflictMessage(conflict), 409);
      }

      const item = await prisma.reservation.create({
        data: {
          userId,
          laboratoryId: data.laboratoryId,
          subjectId: data.subjectId || null,
          title: data.title,
          purpose: data.purpose || null,
          startsAt,
          endsAt,
          attendees,
          status: 'CONFIRMED',
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

      process.end({ id: item.id, role: 'TEACHER', attendees });
      return ok(res, item, 201);
    }

    // ——— ALUMNO: 1 solicitud = 1 cuenta; mínimo 5 para confirmar ———
    // No puede pedir dos veces ni otro lab que se traslape con sus ~2 h activas.
    const overlappingOwn = await prisma.reservation.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
      },
      include: { laboratory: { select: { code: true } } },
    });
    if (overlappingOwn) {
      process.end({ rejected: 'already_busy' });
      const sameLab = overlappingOwn.laboratoryId === data.laboratoryId;
      return fail(
        res,
        sameLab
          ? 'Ya solicitaste este laboratorio en ese horario. No puedes pedirlo dos veces.'
          : `Ya tienes una solicitud activa (~2 h) en ${overlappingOwn.laboratory?.code || 'otro laboratorio'}. En ese lapso no puedes reservar otro lab; espera a que termine.`,
        409,
      );
    }

    // Miembros actuales del slot (pendientes + confirmados alumnos)
    const members = await prisma.reservation.findMany({
      where: {
        laboratoryId: data.laboratoryId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        user: { role: 'STUDENT' },
        AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
      },
      select: { id: true, status: true },
    });
    const groupCount = members.length + 1;
    const maxPeople = maxPeopleForLab(lab.capacity);

    if (groupCount > maxPeople) {
      process.end({ rejected: 'group_full' });
      return fail(
        res,
        `Esta solicitud ya tiene ${members.length} alumnos. El máximo es ${maxPeople} (capacidad del lab).`,
        409,
      );
    }

    // Maestro u ocupación dura que no sea grupo de alumnos
    const hardConflict = await hasConflict(data.laboratoryId, startsAt, endsAt);
    if (hardConflict && hardConflict.user?.role === 'TEACHER') {
      process.end({ rejected: 'schedule_conflict' });
      return fail(res, conflictMessage(hardConflict), 409);
    }

    const slotAlreadyOpen = members.some((m) => m.status === 'CONFIRMED');
    const ready = groupCount >= STUDENT_GROUP_MIN || slotAlreadyOpen;
    const status = ready ? 'CONFIRMED' : 'PENDING';

    const item = await prisma.reservation.create({
      data: {
        userId,
        laboratoryId: data.laboratoryId,
        subjectId: data.subjectId || null,
        title: data.title,
        purpose: data.purpose || null,
        startsAt,
        endsAt,
        attendees: groupCount,
        status,
      },
      include,
    });

    if (members.length) {
      await prisma.reservation.updateMany({
        where: { id: { in: members.map((m) => m.id) } },
        data: {
          attendees: groupCount,
          ...(ready ? { status: 'CONFIRMED' } : {}),
        },
      });
    }

    process.end({ id: item.id, role: 'STUDENT', groupCount, ready, joinedOpen: slotAlreadyOpen });
    return ok(
      res,
      {
        ...item,
        groupCount,
        groupProgress: {
          current: groupCount,
          required: STUDENT_GROUP_MIN,
          max: maxPeople,
          ready,
          message: slotAlreadyOpen
            ? `Te uniste a la reserva de ${lab.code}.`
            : ready
              ? `La solicitud de ${lab.code} quedó confirmada (reservado). Otros alumnos pueden unirse hasta ${maxPeople}.`
              : `Solicitud en curso en ${lab.code} (mínimo ${STUDENT_GROUP_MIN}). Faltan ${Math.max(0, STUDENT_GROUP_MIN - groupCount)}.`,
        },
      },
      201,
    );
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}

export async function update(req, res, next) {
  const process = trackProcess('reservas.update', { id: req.params.id, by: req.user?.id });
  try {
    const id = String(req.params.id);
    const { equipmentIds, ...data } = req.body;
    const actor = req.user;

    const current = await prisma.reservation.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!current) {
      process.end({ notFound: true });
      return fail(res, 'Reserva no encontrada', 404);
    }

    // Alumnos solo editan lo suyo y no pueden cambiar asistentes ni estado a confirmado artificialmente
    if (actor.role === 'STUDENT') {
      if (current.userId !== actor.id) {
        process.end({ denied: true });
        return fail(res, 'Solo puedes modificar tus propias solicitudes.', 403);
      }
      delete data.attendees;
      delete data.userId;
      delete data.status;
    }

    if (actor.role === 'TEACHER' && current.userId !== actor.id && actor.role !== 'ADMIN') {
      // Maestro solo edita las suyas
      if (current.user.role === 'TEACHER' && current.userId !== actor.id) {
        process.end({ denied: true });
        return fail(res, 'Solo puedes modificar tus propias reservas.', 403);
      }
    }

    let attendees = current.attendees;
    if (data.attendees !== undefined) {
      if (actor.role === 'STUDENT') {
        process.end({ rejected: 'student_cannot_set_attendees' });
        return fail(res, 'Los alumnos no pueden indicar la cantidad de asistentes. Solo el maestro puede hacerlo.', 403);
      }
      attendees = Number(data.attendees);
      if (attendees < 1) {
        return fail(res, 'Debes indicar al menos 1 asistente.', 400);
      }
    }

    const laboratoryId = data.laboratoryId ?? current.laboratoryId;
    const labForCap = await prisma.laboratory.findUnique({ where: { id: laboratoryId } });
    if (!labForCap) return fail(res, 'Laboratorio no válido', 400);

    if (data.attendees !== undefined && actor.role !== 'STUDENT') {
      const maxPeople = maxPeopleForLab(labForCap.capacity);
      if (attendees > maxPeople) {
        process.end({ rejected: 'over_capacity' });
        return fail(
          res,
          `Este laboratorio admite máximo ${maxPeople} personas (capacidad del lab: ${labForCap.capacity}).`,
          400,
        );
      }
    }

    let startsAt = data.startsAt
      ? toHourStart(new Date(data.startsAt))
      : toHourStart(current.startsAt);
    let endsAt = data.startsAt
      ? suggestEndFromStart(startsAt)
      : clearSeconds(current.endsAt);

    // Si cambia el inicio, el fin se fija a +1h59m
    if (data.startsAt) {
      endsAt = suggestEndFromStart(startsAt);
    } else if (data.endsAt && !data.startsAt) {
      const maxEnd = suggestEndFromStart(startsAt);
      endsAt = clearSeconds(new Date(data.endsAt));
      if (endsAt > maxEnd) endsAt = maxEnd;
    }

    if (data.laboratoryId && data.laboratoryId !== current.laboratoryId) {
      if (labForCap.status !== 'AVAILABLE') {
        return fail(res, 'Ese laboratorio no está disponible (inactivo).', 400);
      }
    }

    const timeError = validateReservationWindow(startsAt, endsAt, {
      requireFutureStart: Boolean(data.startsAt) || Boolean(data.endsAt) || Boolean(data.laboratoryId),
    });
    if (timeError && (data.startsAt || data.endsAt || data.laboratoryId)) {
      process.end({ rejected: 'invalid_time_window' });
      return fail(res, timeError, 400);
    }

    if (data.laboratoryId || data.startsAt || data.endsAt) {
      const conflict = await hasConflict(laboratoryId, startsAt, endsAt, id);
      if (conflict) {
        process.end({ rejected: 'schedule_conflict' });
        return fail(res, conflictMessage(conflict), 409);
      }
    }

    // Si cambia de laboratorio, libera equipos del lab anterior
    if (data.laboratoryId && data.laboratoryId !== current.laboratoryId) {
      await releaseEquipmentFromReservation(id);
    }

    const updateData = {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.purpose !== undefined ? { purpose: data.purpose } : {}),
      ...(data.laboratoryId ? { laboratoryId: data.laboratoryId } : {}),
      ...(data.subjectId !== undefined ? { subjectId: data.subjectId || null } : {}),
      ...(data.startsAt || data.endsAt
        ? { startsAt, endsAt }
        : {}),
      ...(actor.role !== 'STUDENT' && data.attendees !== undefined ? { attendees } : {}),
      ...(actor.role === 'ADMIN' && data.status ? { status: data.status } : {}),
      ...(actor.role === 'TEACHER' && data.status && current.userId === actor.id
        ? { status: data.status }
        : {}),
    };

    if (equipmentIds && actor.role !== 'STUDENT') {
      await prisma.reservationEquipment.deleteMany({ where: { reservationId: id } });
      if (equipmentIds.length) {
        for (const eq of equipmentIds) {
          await prisma.reservationEquipment.create({
            data: {
              reservationId: id,
              equipmentId: eq.equipmentId,
              quantity: eq.quantity || 1,
            },
          });
        }
      }
    }

    const item = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include,
    });

    process.end({ id });
    return ok(res, item);
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}

export async function remove(req, res, next) {
  const process = trackProcess('reservas.delete', { id: req.params.id, by: req.user?.id });
  try {
    const id = String(req.params.id);
    const actor = req.user;
    const current = await prisma.reservation.findUnique({ where: { id } });
    if (!current) {
      process.end({ notFound: true });
      return fail(res, 'Reserva no encontrada', 404);
    }

    if (actor.role === 'STUDENT' && current.userId !== actor.id) {
      process.end({ denied: true });
      return fail(res, 'Solo puedes cancelar tus propias solicitudes.', 403);
    }
    if (actor.role === 'TEACHER' && current.userId !== actor.id) {
      process.end({ denied: true });
      return fail(res, 'Solo puedes eliminar tus propias reservas.', 403);
    }

    // Libera equipos prestados y elimina la reserva → el lab queda libre en ese horario
    await releaseEquipmentFromReservation(id);
    await prisma.reservation.delete({ where: { id } });
    process.end({ deleted: true, laboratoryId: current.laboratoryId });
    return ok(res, {
      id,
      deleted: true,
      laboratoryId: current.laboratoryId,
      message: 'Reserva eliminada. El laboratorio y equipos asociados quedaron liberados.',
    });
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}
