import { fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

function isDatabaseConnectivityError(err) {
  const text = `${err?.message || ''} ${err?.meta?.message || ''}`.toLowerCase();
  return (
    err?.code === 'P1001' ||
    err?.code === 'P1017' ||
    err?.code === 'P2010' ||
    text.includes('server selection timeout') ||
    text.includes('no available servers') ||
    text.includes('failed to connect') ||
    text.includes('econnrefused') ||
    text.includes('enotfound') ||
    text.includes('mongodb')
  );
}

function publicMessage(err) {
  if (err.code === 'P2002') return { status: 409, message: 'Ya existe un registro con esos datos.' };
  if (err.code === 'P2025') return { status: 404, message: 'El registro solicitado no existe.' };
  if (err.code === 'P2003') return { status: 400, message: 'Hay una referencia inválida a otro registro.' };

  if (isDatabaseConnectivityError(err)) {
    return {
      status: 503,
      message:
        'No se pudo conectar con la base de datos. Intenta de nuevo en unos minutos o contacta al administrador.',
    };
  }

  if (err.status && err.status < 500 && err.message) {
    return { status: err.status, message: err.message };
  }

  // Nunca exponer stack traces ni mensajes crudos de Prisma/Mongo al cliente
  return { status: 500, message: 'Ocurrió un error interno. Intenta de nuevo más tarde.' };
}

export function errorHandler(err, req, res, _next) {
  logger.error('Excepción no controlada', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    path: req.path,
    method: req.method,
  });

  const { status, message } = publicMessage(err);
  return fail(res, message, status);
}
