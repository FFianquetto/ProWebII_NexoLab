import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'nexolab-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

/** Registra inicio/fin (o error) de procesos críticos del backend. */
export function trackProcess(name, meta = {}) {
  const startedAt = Date.now();
  logger.info(`${name}:inicio`, meta);

  return {
    end(extra = {}) {
      logger.info(`${name}:fin`, {
        ...meta,
        ...extra,
        durationMs: Date.now() - startedAt,
      });
    },
    fail(error, extra = {}) {
      logger.error(`${name}:error`, {
        ...meta,
        ...extra,
        durationMs: Date.now() - startedAt,
        message: error?.message || String(error),
        stack: error?.stack,
      });
    },
  };
}
