import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { trackProcess } from '../utils/logger.js';

const reportInclude = {
  createdBy: { select: { id: true, fullName: true, role: true, email: true } },
  laboratory: { select: { id: true, code: true, name: true } },
};

export async function summary(_req, res, next) {
  const process = trackProcess('reportes.summary');
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

      // KPIs: labs, 24 equipos de prestamo, reservas unicas por lab/hora
      (async () => {
        const loanCategories = ['Computadora', 'Casco VR', 'Bocina', 'Multímetro'];
        const [labCount, equipCount, openIncidents, activeUsers, generatedReports, activeRows] =
          await Promise.all([
            prisma.laboratory.count(),
            prisma.equipment.count({
              where: { category: { in: loanCategories } },
            }),
            prisma.incident.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
            prisma.user.count({ where: { isActive: true } }),
            prisma.report.count(),
            prisma.reservation.findMany({
              where: { status: { in: ['PENDING', 'CONFIRMED'] } },
              select: {
                laboratoryId: true,
                startsAt: true,
                user: { select: { role: true } },
              },
            }),
          ]);

        const studentSlots = new Set();
        let teacherCount = 0;
        for (const r of activeRows) {
          if (r.user?.role === 'STUDENT') {
            studentSlots.add(
              `${r.laboratoryId}|${new Date(r.startsAt).toISOString().slice(0, 13)}`,
            );
          } else {
            teacherCount += 1;
          }
        }

        return [
          labCount,
          equipCount,
          teacherCount + studentSlots.size,
          openIncidents,
          activeUsers,
          generatedReports,
        ];
      })(),

      // Historial de reportes generados por maestros y administradores
      prisma.report.findMany({
        include: reportInclude,
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
          laboratoryCode: eq.laboratory?.code || '���',
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

    // Procesamiento Consulta 4: Demanda horaria (solo horas con reservas reales en MongoDB)
    const hourMap = new Map();

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
      .filter((slot) => slot.reservations > 0)
      .sort((a, b) => a.hour_slot - b.hour_slot);

    // Equipos: solo los que tienen uso real en reservas
    const topEquipmentUsed = topEquipment.filter((eq) => eq.times_used > 0);

    process.end({
      labs: occupancyByLab.length,
      equipment: topEquipmentUsed.length,
      savedReports: savedReports.length,
    });

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
      topEquipment: topEquipmentUsed,
      incidentsByStatus,
      reservationsByHour,
      savedReports,
    });
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = String(req.params.id);
    const report = await prisma.report.findUnique({
      where: { id },
      include: reportInclude,
    });
    if (!report) return fail(res, 'Reporte no encontrado', 404);
    return ok(res, report);
  } catch (error) {
    return next(error);
  }
}

// Generación / Creación de reportes:
// REGLA: Los que hacen reportes sólo pueden ser Maestros o Administradores.
export async function create(req, res, next) {
  const process = trackProcess('reportes.create', { by: req.user?.id });
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      process.end({ denied: true });
      return fail(res, 'Sólo el administrador puede generar reportes oficiales.', 403);
    }

    const { title, type = 'GENERAL', summary: reportSummary, notes, laboratoryId } = req.body;

    if (laboratoryId) {
      const lab = await prisma.laboratory.findUnique({ where: { id: laboratoryId } });
      if (!lab) {
        process.end({ invalidLab: true });
        return fail(res, 'El laboratorio indicado no existe', 400);
      }
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
      include: reportInclude,
    });

    process.end({ reportId: report.id });
    return ok(res, report, 201);
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}

export async function update(req, res, next) {
  const process = trackProcess('reportes.update', { id: req.params.id, by: req.user?.id });
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      process.end({ denied: true });
      return fail(res, 'Sólo el administrador puede actualizar reportes.', 403);
    }

    const id = String(req.params.id);
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      process.end({ notFound: true });
      return fail(res, 'Reporte no encontrado', 404);
    }

    const { title, type, summary: reportSummary, notes, laboratoryId } = req.body;

    if (laboratoryId) {
      const lab = await prisma.laboratory.findUnique({ where: { id: laboratoryId } });
      if (!lab) {
        process.end({ invalidLab: true });
        return fail(res, 'El laboratorio indicado no existe', 400);
      }
    }

    const report = await prisma.report.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(reportSummary !== undefined ? { summary: reportSummary } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(laboratoryId !== undefined ? { laboratoryId: laboratoryId || null } : {}),
      },
      include: reportInclude,
    });

    process.end({ reportId: report.id });
    return ok(res, report);
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}

export async function remove(req, res, next) {
  const process = trackProcess('reportes.delete', { id: req.params.id, by: req.user?.id });
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      process.end({ denied: true });
      return fail(res, 'Sólo el administrador puede eliminar reportes.', 403);
    }

    const id = String(req.params.id);
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      process.end({ notFound: true });
      return fail(res, 'Reporte no encontrado', 404);
    }

    await prisma.report.delete({ where: { id } });
    process.end({ deleted: true });
    return ok(res, { id, deleted: true });
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}
