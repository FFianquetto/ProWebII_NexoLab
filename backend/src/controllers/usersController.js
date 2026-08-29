import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

function publicUser(user) {
  if (!user) return user;
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function list(req, res, next) {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    return ok(res, users.map(publicUser));
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return fail(res, 'Usuario no encontrado', 404);
    return ok(res, publicUser(user));
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const { email, password, fullName, role, studentId, phone } = req.body;
    if (!password) return fail(res, 'La contraseña es obligatoria', 422);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: role || 'STUDENT',
        studentId: studentId || null,
        phone: phone || null,
      },
    });
    logger.info('Usuario creado', { userId: user.id, by: req.user?.id });
    return ok(res, publicUser(user), 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = { ...req.body };
    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }
    const user = await prisma.user.update({ where: { id }, data });
    logger.info('Usuario actualizado', { userId: id, by: req.user?.id });
    return ok(res, publicUser(user));
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return fail(res, 'No puedes eliminar tu propia cuenta', 400);

    const reservations = await prisma.reservation.count({ where: { userId: id } });
    const incidents = await prisma.incident.count({ where: { reportedById: id } });
    if (reservations > 0 || incidents > 0) {
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      logger.info('Usuario desactivado (tiene relaciones)', { userId: id });
      return ok(res, { id, deactivated: true });
    }

    await prisma.user.delete({ where: { id } });
    logger.info('Usuario eliminado', { userId: id, by: req.user?.id });
    return ok(res, { id, deleted: true });
  } catch (error) {
    return next(error);
  }
}
