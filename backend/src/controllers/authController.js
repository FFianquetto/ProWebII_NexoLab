import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { ok, fail } from '../utils/response.js';
import { logger, trackProcess } from '../utils/logger.js';

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
  const process = trackProcess('auth.register', { email: req.body?.email });
  try {
    const { email, password, fullName, role, studentId, phone } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      process.end({ conflict: true });
      return fail(res, 'Ese correo ya está registrado. Prueba iniciar sesión o usa otro correo.', 409);
    }

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

    process.end({ userId: user.id });
    const token = signToken(user);
    return ok(res, { token, user: publicUser(user) }, 201);
  } catch (error) {
    process.fail(error);
    return next(error);
  }
}

export async function login(req, res, next) {
  const process = trackProcess('auth.login', { email: req.body?.email });
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      logger.warn('Intento de login fallido', { email, reason: 'not_found_or_inactive' });
      process.end({ success: false, reason: 'invalid_credentials' });
      return fail(res, 'Correo o contraseña incorrectos.', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn('Intento de login fallido', { email, reason: 'bad_password' });
      process.end({ success: false, reason: 'invalid_credentials' });
      return fail(res, 'Correo o contraseña incorrectos.', 401);
    }

    process.end({ success: true, userId: user.id });
    const token = signToken(user);
    return ok(res, { token, user: publicUser(user) });
  } catch (error) {
    process.fail(error);
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
