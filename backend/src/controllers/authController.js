import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function register(req, res, next) {
  try {
    const { email, password, fullName, role, studentId, phone } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return fail(res, 'El correo ya está registrado', 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: role === 'ADMIN' ? 'STUDENT' : role || 'STUDENT',
        studentId: studentId || null,
        phone: phone || null,
      },
    });

    logger.info('Usuario registrado', { userId: user.id, email: user.email });
    const token = signToken(user);
    return ok(res, { token, user: publicUser(user) }, 201);
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      logger.warn('Intento de login fallido', { email });
      return fail(res, 'Credenciales inválidas', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn('Intento de login fallido', { email });
      return fail(res, 'Credenciales inválidas', 401);
    }

    logger.info('Login exitoso', { userId: user.id, email });
    const token = signToken(user);
    return ok(res, { token, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return fail(res, 'Usuario no encontrado', 404);
    return ok(res, publicUser(user));
  } catch (error) {
    return next(error);
  }
}
