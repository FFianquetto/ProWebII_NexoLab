import { prisma } from '../lib/prisma.js';
import { ok } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function summary(_req, res, next) {
  try {
    const [
      occupancyByLab,
      topEquipment,
      incidentsByStatus,
      reservationsByHour,
      kpis,
    ] = await Promise.all([
      // 1) Ocupación / reservas por laboratorio (multi-tabla)
      prisma.$queryRaw`
        SELECT l.id, l.code, l.name, l.capacity,
               COUNT(r.id) AS total_reservations,
               SUM(CASE WHEN r.status IN ('CONFIRMED','COMPLETED') THEN 1 ELSE 0 END) AS confirmed_or_done,
               SUM(CASE WHEN r.status = 'NO_SHOW' THEN 1 ELSE 0 END) AS no_shows,
               ROUND(AVG(r.attendees), 1) AS avg_attendees
        FROM laboratories l
        LEFT JOIN reservations r ON r.laboratory_id = l.id
        GROUP BY l.id, l.code, l.name, l.capacity
        ORDER BY total_reservations DESC
      `,

      // 2) Equipo más solicitado en reservas
      prisma.$queryRaw`
        SELECT e.id, e.inventory_code AS inventoryCode, e.name, e.category,
               l.code AS laboratoryCode, COUNT(re.id) AS times_used,
               SUM(re.quantity) AS total_quantity
        FROM equipment e
        INNER JOIN reservation_equipment re ON re.equipment_id = e.id
        INNER JOIN reservations r ON r.id = re.reservation_id
        INNER JOIN laboratories l ON l.id = e.laboratory_id
        GROUP BY e.id, e.inventory_code, e.name, e.category, l.code
        ORDER BY times_used DESC
        LIMIT 10
      `,

      // 3) Incidencias por estado y severidad (lab + equipo + usuario)
      prisma.$queryRaw`
        SELECT i.status, i.severity, COUNT(*) AS total,
               COUNT(DISTINCT i.laboratory_id) AS labs_affected,
               COUNT(DISTINCT i.equipment_id) AS equipment_affected
        FROM incidents i
        GROUP BY i.status, i.severity
        ORDER BY total DESC
      `,

      // 4) Picos horarios de reservas (KPI de demanda)
      prisma.$queryRaw`
        SELECT HOUR(r.starts_at) AS hour_slot,
               COUNT(*) AS reservations,
               COUNT(DISTINCT r.laboratory_id) AS labs_used,
               COUNT(DISTINCT r.user_id) AS unique_users
        FROM reservations r
        WHERE r.status IN ('PENDING','CONFIRMED','COMPLETED','NO_SHOW')
        GROUP BY HOUR(r.starts_at)
        ORDER BY hour_slot ASC
      `,

      prisma.$transaction([
        prisma.laboratory.count(),
        prisma.equipment.count(),
        prisma.reservation.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
        prisma.incident.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.user.count({ where: { isActive: true } }),
      ]),
    ]);

    logger.info('Reportes consultados');

    return ok(res, {
      kpis: {
        laboratories: Number(kpis[0]),
        equipment: Number(kpis[1]),
        activeReservations: Number(kpis[2]),
        openIncidents: Number(kpis[3]),
        activeUsers: Number(kpis[4]),
      },
      occupancyByLab: serializeBigInt(occupancyByLab),
      topEquipment: serializeBigInt(topEquipment),
      incidentsByStatus: serializeBigInt(incidentsByStatus),
      reservationsByHour: serializeBigInt(reservationsByHour),
    });
  } catch (error) {
    return next(error);
  }
}

function serializeBigInt(rows) {
  return rows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      out[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    return out;
  });
}
