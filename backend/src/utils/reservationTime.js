/** Duración fija: 1 h 59 min → a las 2 h exactas el lab/equipo ya está libre. */
export const RESERVATION_DURATION_MS = (1 * 60 + 59) * 60 * 1000;
export const MAX_RESERVATION_MS = RESERVATION_DURATION_MS;

/** Horario operativo: inicio 08:00–20:00; fin del préstamo a más tardar 22:00. */
export const BUSINESS_START_HOUR = 8;
export const BUSINESS_LAST_START_HOUR = 20; // 8:00 p.m.
export const BUSINESS_LATEST_END_HOUR = 22; // 10:00 p.m.

/** Inicio en hora en punto (09:00, 10:00…). No usar en la hora de fin. */
export function toHourStart(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/** Solo limpia segundos/ms; conserva minutos (p. ej. 11:59). */
export function clearSeconds(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

/** @deprecated usar toHourStart */
export function stripSeconds(date) {
  return toHourStart(date);
}

export function isBusinessStartHour(date) {
  const h = toHourStart(date).getHours();
  return h >= BUSINESS_START_HOUR && h <= BUSINESS_LAST_START_HOUR;
}

export function endsWithinBusinessClose(endsAt) {
  const end = clearSeconds(endsAt);
  const limit = new Date(end);
  limit.setHours(BUSINESS_LATEST_END_HOUR, 0, 0, 0);
  return end.getTime() <= limit.getTime();
}

/**
 * Valida fechas de reserva.
 * @returns mensaje de error en español o null si es válido.
 */
export function validateReservationWindow(startsAt, endsAt, { requireFutureStart = true } = {}) {
  const start = toHourStart(startsAt);
  const end = clearSeconds(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Las fechas de inicio o fin no son válidas.';
  }

  if (end <= start) {
    return 'La hora de fin debe ser posterior a la de inicio.';
  }

  const durationMs = end.getTime() - start.getTime();
  if (durationMs > MAX_RESERVATION_MS) {
    return 'Cada reserva dura como máximo 1 hora y 59 minutos.';
  }

  if (!isBusinessStartHour(start)) {
    return 'Solo puedes reservar entre las 8:00 a.m. y las 8:00 p.m. (sin horario nocturno).';
  }

  if (!endsWithinBusinessClose(end)) {
    return 'El préstamo no puede terminar después de las 10:00 p.m.';
  }

  if (requireFutureStart) {
    const now = Date.now();
    if (start.getTime() < now - 60_000) {
      return 'No puedes solicitar un horario que ya pasó. Elige una fecha y hora futuras.';
    }
  }

  return null;
}

/** Fin automático: inicio + 1 h 59 min. */
export function suggestEndFromStart(startsAt) {
  const start = toHourStart(startsAt);
  return clearSeconds(new Date(start.getTime() + RESERVATION_DURATION_MS));
}
