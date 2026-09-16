import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function summary(_req, res, next) {
  try {
    const [
      laboratories,
      equipmentList,
      incidents,
      reservations,
      kpiCounts,
      savedReports,
    ] = await Promise.all([
      // 1) Laboratorios con reservas para análisis de ocupación (multi-colección)
      prisma.laboratory.findMany({
        include: {
          reservations: {
            select: { id: true, status: true, attendees: true },
          },
        },
      }),

      // 2) Equipos con asignaciones y datos de laboratorio (multi-colección)
      prisma.equipment.findMany({
        include: {
          laboratory: { select: { code: true } },
          reservationEquipment: { select: { id: true, quantity: true } },
        },
      }),

      // 3) Incidencias con laboratorio y equipo (multi-colección)
      prisma.incident.findMany({
        select: {
          status: true,
          severity: true,
          laboratoryId: true,
          equipmentId: true,
        },
      }),

      // 4) Reservas para picos horarios (multi-colección)
      prisma.reservation.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
        },
        select: {
          startsAt: true,
          laboratoryId: true,
          userId: true,
        },
      }),

      // KPIs generales
      Promise.all([
        prisma.laboratory.count(),
        prisma.equipment.count(),
        prisma.reservation.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
        prisma.incident.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.report.count(),
      ]),

      // Historial de reportes generados por maestros y administradores
      prisma.report.findMany({
        include: {
          createdBy: { select: { id: true, fullName: true, role: true, email: true } },
          laboratory: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Procesamiento Consulta 1: Ocupación por laboratorio
    const occupancyByLab = laboratories
      .map((lab) => {
        const total = lab.reservations.length;
        const confirmed = lab.reservations.filter((r) =>
          ['CONFIRMED', 'COMPLETED'].includes(r.status),
        ).length;
        const noShows = lab.reservations.filter((r) => r.status === 'NO_SHOW').length;
        const sumAttendees = lab.reservations.reduce((acc, r) => acc + (r.attendees || 0), 0);
        const avgAttendees = total > 0 ? Number((sumAttendees / total).toFixed(1)) : 0;

        return {
          id: lab.id,
          code: lab.code,
          name: lab.name,
          capacity: lab.capacity,
          total_reservations: total,
          confirmed_or_done: confirmed,
          no_shows: noShows,
          avg_attendees: avgAttendees,
        };
      })
      .sort((a, b) => b.total_reservations - a.total_reservations);

    // Procesamiento Consulta 2: Equipos más utilizados en reservas
    const topEquipment = equipmentList
      .map((eq) => {
        const timesUsed = eq.reservationEquipment.length;
        const totalQuantity = eq.reservationEquipment.reduce(
          (acc, re) => acc + (re.quantity || 1),
          0,
        );
        return {
          id: eq.id,
          inventoryCode: eq.inventoryCode,
          name: eq.name,
          category: eq.category,
          laboratoryCode: eq.laboratory?.code || '—',
          times_used: timesUsed,
          total_quantity: totalQuantity,
        };
      })
      .sort((a, b) => b.times_used - a.times_used)
      .slice(0, 10);

    // Procesamiento Consulta 3: Incidencias agrupadas por estado y severidad
    const incidentGroups = new Map();
    for (const inc of incidents) {
      const key = `${inc.status}__${inc.severity}`;
      if (!incidentGroups.has(key)) {
        incidentGroups.set(key, {
          status: inc.status,
          severity: inc.severity,
          total: 0,
          labs: new Set(),
          equipments: new Set(),
        });
      }
      const g = incidentGroups.get(key);
      g.total += 1;
      if (inc.laboratoryId) g.labs.add(inc.laboratoryId);
      if (inc.equipmentId) g.equipments.add(inc.equipmentId);
    }

    const incidentsByStatus = Array.from(incidentGroups.values())
      .map((g) => ({
        status: g.status,
        severity: g.severity,
        total: g.total,
        labs_affected: g.labs.size,
        equipment_affected: g.equipments.size,
      }))
      .sort((a, b) => b.total - a.total);

    // Procesamiento Consulta 4: Demanda horaria de reservas
    const hourMap = new Map();
    for (let h = 7; h <= 21; h++) {
      hourMap.set(h, { hour_slot: h, reservations: 0, labs: new Set(), users: new Set() });
    }

    for (const resItem of reservations) {
      const hour = new Date(resItem.startsAt).getHours();
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { hour_slot: hour, reservations: 0, labs: new Set(), users: new Set() });
      }
      const slot = hourMap.get(hour);
      slot.reservations += 1;
      if (resItem.laboratoryId) slot.labs.add(resItem.laboratoryId);
      if (resItem.userId) slot.users.add(resItem.userId);
    }

    const reservationsByHour = Array.from(hourMap.values())
      .map((slot) => ({
        hour_slot: slot.hour_slot,
        reservations: slot.reservations,
        labs_used: slot.labs.size,
        unique_users: slot.users.size,
      }))
      .filter((slot) => slot.reservations > 0 || (slot.hour_slot >= 8 && slot.hour_slot <= 19))
      .sort((a, b) => a.hour_slot - b.hour_slot);

    logger.info('Reportes consultados');

    return ok(res, {
      kpis: {
        laboratories: Number(kpiCounts[0]),
        equipment: Number(kpiCounts[1]),
        activeReservations: Number(kpiCounts[2]),
        openIncidents: Number(kpiCounts[3]),
        activeUsers: Number(kpiCounts[4]),
        generatedReports: Number(kpiCounts[5]),
      },
      occupancyByLab,
      topEquipment,
      incidentsByStatus,
      reservationsByHour,
      savedReports,
    });
  } catch (error) {
    return next(error);
  }
}

// Generación / Creación de reportes:
// REGLA: Los que hacen reportes sólo pueden ser Maestros o Administradores.
export async function create(req, res, next) {
  try {
    if (!req.user || !['ADMIN', 'TEACHER'].includes(req.user.role)) {
      return fail(res, 'Sólo los maestros o administradores tienen permiso para generar reportes.', 403);
    }

    const { title, type = 'GENERAL', summary: reportSummary, notes, laboratoryId } = req.body;

    if (laboratoryId) {
      const lab = await prisma.laboratory.findUnique({ where: { id: laboratoryId } });
      if (!lab) return fail(res, 'El laboratorio indicado no existe', 400);
    }

    const report = await prisma.report.create({
      data: {
        title,
        type,
        summary: reportSummary,
        notes: notes || null,
        laboratoryId: laboratoryId || null,
        createdById: req.user.id,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true, email: true } },
        laboratory: { select: { id: true, code: true, name: true } },
      },
    });

    logger.info('Reporte generado exitosamente', {
      reportId: report.id,
      createdById: req.user.id,
      role: req.user.role,
    });

    return ok(res, report, 201);
  } catch (error) {
    return next(error);
  }
}

// Eliminación de reportes: Maestros y Administradores
export async function remove(req, res, next) {
  try {
    if (!req.user || !['ADMIN', 'TEACHER'].includes(req.user.role)) {
      return fail(res, 'No tienes permisos para eliminar reportes.', 403);
    }

    const id = String(req.params.id);
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) return fail(res, 'Reporte no encontrado', 404);

    // Los maestros sólo pueden borrar sus propios reportes; administradores pueden borrar cualquiera
    if (req.user.role === 'TEACHER' && existing.createdById !== req.user.id) {
      return fail(res, 'Los maestros sólo pueden eliminar los reportes que ellos mismos generaron.', 403);
    }

    await prisma.report.delete({ where: { id } });
    logger.info('Reporte eliminado', { id, by: req.user.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
