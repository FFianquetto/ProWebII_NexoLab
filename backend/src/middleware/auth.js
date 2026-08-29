import jwt from 'jsonwebtoken';
import { fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return fail(res, 'Token de autorización requerido', 401);
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    logger.warn('Token inválido', { error: error.message, path: req.path });
    return fail(res, 'Token inválido o expirado', 401);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return fail(res, 'No tienes permisos para esta acción', 403);
    }
    return next();
  };
}
