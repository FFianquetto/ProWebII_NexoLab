import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const include = {
  laboratory: { select: { id: true, code: true, name: true } },
  equipment: { select: { id: true, inventoryCode: true, name: true } },
  reportedBy: { select: { id: true, fullName: true, email: true, role: true } },
};

function resolveKind(body) {
  if (body.kind === 'EQUIPMENT' || body.kind === 'LABORATORY') return body.kind;
  if (body.equipmentId) return 'EQUIPMENT';
  return 'LABORATORY';
}

export async function list(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return ok(res, []);
    }
    const kind = req.query.kind ? String(req.query.kind).toUpperCase() : null;
    const items = await prisma.incident.findMany({
      where:
        kind === 'LABORATORY' || kind === 'EQUIPMENT'
          ? { kind }
          : undefined,
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
    if (req.user.role !== 'ADMIN') {
      return fail(res, 'Sólo el administrador puede consultar incidencias.', 403);
    }
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
    const reportedById = req.user.id;
    const reporter = await prisma.user.findUnique({ where: { id: reportedById } });
    if (!reporter) return fail(res, 'Reportante no válido', 400);

    const kind = resolveKind(req.body);

    if (kind === 'LABORATORY') {
      if (!req.body.laboratoryId) {
        return fail(res, 'Selecciona el laboratorio afectado.', 400);
      }
      const lab = await prisma.laboratory.findUnique({ where: { id: req.body.laboratoryId } });
      if (!lab) return fail(res, 'Laboratorio no válido', 400);
    }

    if (kind === 'EQUIPMENT') {
      if (!req.body.equipmentId) {
        return fail(res, 'Selecciona el equipo afectado.', 400);
      }
      const eq = await prisma.equipment.findUnique({ where: { id: req.body.equipmentId } });
      if (!eq) return fail(res, 'Equipo no válido', 400);
    }

    if (req.body.laboratoryId && kind === 'EQUIPMENT') {
      const lab = await prisma.laboratory.findUnique({ where: { id: req.body.laboratoryId } });
      if (!lab) return fail(res, 'Laboratorio no válido', 400);
    }

    const data = {
      title: req.body.title,
      description: req.body.description,
      severity: req.body.severity || 'MEDIUM',
      kind,
      reportedById,
      status: 'OPEN',
      laboratoryId: kind === 'LABORATORY' ? req.body.laboratoryId : req.body.laboratoryId || null,
      equipmentId: kind === 'EQUIPMENT' ? req.body.equipmentId : null,
    };

    const item = await prisma.incident.create({ data, include });
    logger.info('Incidencia creada', { id: item.id, kind, by: req.user?.id });
    return ok(res, item, 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return fail(res, 'Sólo el administrador puede actualizar incidencias.', 403);
    }
    const id = String(req.params.id);
    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing) return fail(res, 'Incidencia no encontrada', 404);

    // Admin solo cambia estado (resolver/cerrar); no edita el contenido del reporte
    const nextStatus = req.body.status ? String(req.body.status) : existing.status;
    const data = { status: nextStatus };
    if (['RESOLVED', 'CLOSED'].includes(nextStatus) && !existing.resolvedAt) {
      data.resolvedAt = new Date();
    }
    if (nextStatus === 'OPEN' || nextStatus === 'IN_PROGRESS') {
      data.resolvedAt = null;
    }

    const item = await prisma.incident.update({ where: { id }, data, include });
    logger.info('Incidencia actualizada', { id, status: nextStatus, by: req.user?.id });
    return ok(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return fail(res, 'Sólo el administrador puede eliminar incidencias.', 403);
    }
    const id = String(req.params.id);
    await prisma.incident.delete({ where: { id } });
    logger.info('Incidencia eliminada', { id, by: req.user?.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
