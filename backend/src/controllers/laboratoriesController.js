import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { suggestEndFromStart } from '../utils/reservationTime.js';

const STUDENT_GROUP_MIN = 5;

function slotKey(startsAt) {
  return new Date(startsAt).toISOString().slice(0, 13);
}

function groupByStartHour(rows) {
  const slotMap = new Map();
  for (const r of rows) {
    const key = slotKey(r.startsAt);
    if (!slotMap.has(key)) {
      const start = new Date(r.startsAt);
      slotMap.set(key, {
        count: 0,
        startsAt: r.startsAt,
        endsAt: suggestEndFromStart(start),
      });
    }
    slotMap.get(key).count += 1;
  }
  return Array.from(slotMap.values()).sort((a, b) => b.count - a.count);
}

function earliestEndsAt(rows) {
  if (!rows.length) return null;
  return rows.reduce((min, r) => {
    const e = new Date(r.endsAt);
    return !min || e < min ? e : min;
  }, null);
}

/**
 * Disponibilidad del lab.
 * - Reserva de maestro: ocupado, no se puede unir
 * - Grupo de alumnos (pendiente o ya reservado): se puede unir hasta capacidad
 * - alreadyJoined: el usuario actual ya está en ese slot
 */
function buildDemand(lab, userId = null) {
  const now = new Date();
  const upcoming = (lab.reservations || []).filter((r) => new Date(r.endsAt) >= now);

  const base = {
    pendingStudents: 0,
    required: STUDENT_GROUP_MIN,
    available: false,
    canJoin: false,
    alreadyJoined: false,
    freeAt: null,
    joinStartsAt: null,
    joinEndsAt: null,
  };

  if (lab.status !== 'AVAILABLE') {
    return {
      ...base,
      occupancy: 'UNAVAILABLE',
      label:
        lab.status === 'MAINTENANCE'
          ? 'En mantenimiento'
          : lab.status === 'CLOSED'
            ? 'Cerrado'
            : 'No disponible',
    };
  }

  const confirmed = upcoming.filter((r) => r.status === 'CONFIRMED');
  const confirmedTeachers = confirmed.filter((r) => r.user?.role === 'TEACHER');
  const confirmedStudents = confirmed.filter((r) => r.user?.role === 'STUDENT');
  const pendingStudents = upcoming.filter(
    (r) => r.status === 'PENDING' && r.user?.role === 'STUDENT',
  );

  const uid = userId ? String(userId) : null;
  const isLabMember = (rows) => {
    if (!uid) return false;
    return rows.some(
      (r) => String(r.userId) === uid || String(r.user?.id) === uid,
    );
  };
  const alreadyJoinedAny = isLabMember([...confirmedStudents, ...pendingStudents]);

  if (confirmedTeachers.length > 0) {
    const freeAt = earliestEndsAt(confirmedTeachers);
    return {
      ...base,
      occupancy: 'OCCUPIED',
      label: 'Reservado',
      alreadyJoined: alreadyJoinedAny,
      freeAt: freeAt ? freeAt.toISOString() : null,
    };
  }

  if (confirmedStudents.length > 0) {
    const slots = groupByStartHour(confirmedStudents);
    const hottest = slots[0];
    return {
      ...base,
      occupancy: 'OCCUPIED',
      label: 'Reservado',
      pendingStudents: hottest.count,
      available: !alreadyJoinedAny,
      canJoin: !alreadyJoinedAny,
      alreadyJoined: alreadyJoinedAny,
      freeAt: hottest?.endsAt ? new Date(hottest.endsAt).toISOString() : null,
      joinStartsAt: hottest?.startsAt ? new Date(hottest.startsAt).toISOString() : null,
      joinEndsAt: hottest?.endsAt ? new Date(hottest.endsAt).toISOString() : null,
    };
  }

  const pendingSlots = groupByStartHour(pendingStudents);
  const hottest = pendingSlots[0] || null;
  if (hottest && hottest.count > 0) {
    return {
      ...base,
      occupancy: 'GATHERING',
      label: 'Solicitado',
      pendingStudents: hottest.count,
      available: !alreadyJoinedAny,
      canJoin: !alreadyJoinedAny,
      alreadyJoined: alreadyJoinedAny,
      freeAt: hottest.endsAt ? new Date(hottest.endsAt).toISOString() : null,
      joinStartsAt: hottest.startsAt ? new Date(hottest.startsAt).toISOString() : null,
      joinEndsAt: hottest.endsAt ? new Date(hottest.endsAt).toISOString() : null,
    };
  }

  return {
    ...base,
    occupancy: 'FREE',
    label: 'Disponible',
    available: true,
  };
}

export async function list(req, res, next) {
  try {
    const now = new Date();
    const userId = req.user?.id || null;
    const items = await prisma.laboratory.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { equipment: true, reservations: true } },
        reservations: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            endsAt: { gte: now },
          },
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { startsAt: 'asc' },
        },
      },
    });

    const occupancyOrder = {
      FREE: 0,
      GATHERING: 1,
      OCCUPIED: 2,
      UNAVAILABLE: 3,
    };

    const enriched = items
      .map((lab) => {
        const { reservations, ...rest } = lab;
        return {
          ...rest,
          demand: buildDemand(lab, userId),
        };
      })
      .sort((a, b) => {
        const byOcc =
          (occupancyOrder[a.demand?.occupancy] ?? 99) -
          (occupancyOrder[b.demand?.occupancy] ?? 99);
        if (byOcc !== 0) return byOcc;
        return String(a.code).localeCompare(String(b.code));
      });

    return ok(res, enriched);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = String(req.params.id);
    const now = new Date();
    const item = await prisma.laboratory.findUnique({
      where: { id },
      include: {
        equipment: true,
        reservations: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            endsAt: { gte: now },
          },
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { startsAt: 'asc' },
        },
      },
    });
    if (!item) return fail(res, 'Laboratorio no encontrado', 404);
    const { reservations, ...rest } = item;
    return ok(res, { ...rest, demand: buildDemand(item, req.user?.id || null) });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const item = await prisma.laboratory.create({ data: req.body });
    logger.info('Laboratorio dado de alta por administrador', { id: item.id, by: req.user?.id });
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
    if (req.body.code !== undefined) data.code = req.body.code;
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.building !== undefined) data.building = req.body.building;
    if (req.body.floor !== undefined) data.floor = req.body.floor;
    if (req.body.capacity !== undefined) data.capacity = req.body.capacity;
    if (req.body.description !== undefined) data.description = req.body.description;

    if (!Object.keys(data).length) {
      return fail(res, 'No hay campos para actualizar.', 400);
    }

    if (data.status === 'MAINTENANCE') {
      const existing = await prisma.laboratory.findUnique({ where: { id } });
      if (!existing) return fail(res, 'Laboratorio no encontrado', 404);

      const now = new Date();
      const activeRes = await prisma.reservation.findFirst({
        where: {
          laboratoryId: id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          endsAt: { gt: now },
        },
        select: { id: true, title: true, endsAt: true },
      });

      if (activeRes) {
        return fail(
          res,
          `No se puede poner en mantenimiento "${existing.code} — ${existing.name}": tiene una reserva en curso. Espera a que termine.`,
          409,
        );
      }
    }

    const item = await prisma.laboratory.update({ where: { id }, data });
    logger.info('Laboratorio actualizado por administrador', {
      id,
      status: item.status,
      by: req.user?.id,
    });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = String(req.params.id);
    const equipment = await prisma.equipment.count({ where: { laboratoryId: id } });
    const reservations = await prisma.reservation.count({ where: { laboratoryId: id } });

    if (equipment > 0 || reservations > 0) {
      await prisma.laboratory.update({ where: { id }, data: { status: 'CLOSED' } });
      logger.info('Laboratorio dado de baja (estado CLOSED) por tener dependencias', {
        id,
        by: req.user?.id,
      });
      return ok(res, {
        id,
        closed: true,
        message: 'Laboratorio dado de baja (marcado como CERRADO)',
      });
    }

    await prisma.laboratory.delete({ where: { id } });
    logger.info('Laboratorio eliminado por administrador', { id, by: req.user?.id });
    return ok(res, { id, deleted: true, message: 'Laboratorio eliminado permanentemente' });
  } catch (error) {
    return next(error);
  }
}
