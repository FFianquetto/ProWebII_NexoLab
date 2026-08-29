import { fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  logger.error('Excepción no controlada', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.code === 'P2002') {
    return fail(res, 'Registro duplicado: viola una restricción única', 409);
  }
  if (err.code === 'P2025') {
    return fail(res, 'Registro no encontrado', 404);
  }
  if (err.code === 'P2003') {
    return fail(res, 'Referencia inválida a otro registro', 400);
  }

  const status = err.status || 500;
  return fail(res, err.message || 'Error interno del servidor', status);
}
