/** Duración fija de una reserva: 1 h 59 min (a las 2 h el lab ya está libre). */
export const RESERVATION_DURATION_MS = (1 * 60 + 59) * 60 * 1000;

/** Tope máximo = duración fija (1 h 59 min). */
export const MAX_RESERVATION_MS = RESERVATION_DURATION_MS;

/** Horario operativo: inicio 08:00–20:00; fin del préstamo a más tardar 22:00. */
export const BUSINESS_START_HOUR = 8;
export const BUSINESS_LAST_START_HOUR = 20;
export const BUSINESS_LATEST_END_HOUR = 22;

/** Inicio en hora en punto (09:00, 10:00…). No usar en la hora de fin. */
export function toHourStart(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/** Solo limpia segundos/ms; conserva minutos (p. ej. 11:59). */
export function clearSeconds(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

/** @deprecated usar toHourStart */
export function stripSeconds(date: Date): Date {
  return toHourStart(date);
}

export function isBusinessStartHour(date: Date): boolean {
  const h = toHourStart(date).getHours();
  return h >= BUSINESS_START_HOUR && h <= BUSINESS_LAST_START_HOUR;
}

export function endsWithinBusinessClose(endsAt: Date): boolean {
  const end = clearSeconds(endsAt);
  const limit = new Date(end);
  limit.setHours(BUSINESS_LATEST_END_HOUR, 0, 0, 0);
  return end.getTime() <= limit.getTime();
}

export function validateReservationWindow(
  startsAt?: string | Date | null,
  endsAt?: string | Date | null,
): string | null {
  if (!startsAt || !endsAt) return 'Indica fecha y hora de inicio.';

  const start = toHourStart(new Date(startsAt));
  const end = clearSeconds(new Date(endsAt));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Las fechas de inicio o fin no son válidas.';
  }

  if (end <= start) {
    return 'La hora de fin debe ser posterior a la de inicio.';
  }

  if (end.getTime() - start.getTime() > MAX_RESERVATION_MS) {
    return 'Cada reserva dura como máximo 1 hora y 59 minutos.';
  }

  if (!isBusinessStartHour(start)) {
    return 'Solo puedes reservar entre las 8:00 a.m. y las 8:00 p.m. (sin horario nocturno).';
  }

  if (!endsWithinBusinessClose(end)) {
    return 'El préstamo no puede terminar después de las 10:00 p.m.';
  }

  if (start.getTime() < Date.now() - 60_000) {
    return 'No puedes solicitar un horario que ya pasó. Elige una fecha y hora futuras.';
  }

  return null;
}

/** Fin automático: inicio + 1 h 59 min. */
export function suggestEndFromStart(startsAtIso: string): string {
  const start = toHourStart(new Date(startsAtIso));
  const end = clearSeconds(new Date(start.getTime() + RESERVATION_DURATION_MS));
  return end.toISOString();
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

/** ¿Esta hora de inicio choca con algún slot ocupado (considerando duración 1h59)? */
export function isStartHourBlocked(
  startsAtIso: string,
  busy: Array<{ startsAt: string; endsAt: string }>,
): boolean {
  const start = toHourStart(new Date(startsAtIso));
  const end = clearSeconds(new Date(start.getTime() + RESERVATION_DURATION_MS));
  return busy.some((slot) =>
    rangesOverlap(start, end, new Date(slot.startsAt), new Date(slot.endsAt)),
  );
}

export function isOutsideBusinessHours(startsAtIso: string): boolean {
  return !isBusinessStartHour(new Date(startsAtIso));
}

/** Próxima hora en punto válida dentro del horario 8:00–20:00. */
export function nextBusinessStart(from: Date = new Date()): Date {
  let d = toHourStart(from);
  if (d.getTime() <= from.getTime()) {
    d = new Date(d.getTime() + 60 * 60 * 1000);
  }
  while (
    d.getHours() < BUSINESS_START_HOUR ||
    d.getHours() > BUSINESS_LAST_START_HOUR ||
    d.getTime() < Date.now()
  ) {
    if (d.getHours() > BUSINESS_LAST_START_HOUR || d.getHours() < BUSINESS_START_HOUR) {
      if (d.getHours() >= BUSINESS_LATEST_END_HOUR || d.getHours() > BUSINESS_LAST_START_HOUR) {
        d.setDate(d.getDate() + 1);
        d.setHours(BUSINESS_START_HOUR, 0, 0, 0);
      } else {
        d.setHours(BUSINESS_START_HOUR, 0, 0, 0);
      }
    } else {
      d = new Date(d.getTime() + 60 * 60 * 1000);
    }
  }
  return d;
}

export function formatReservationDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Solo hora (sin segundos) para “libre desde…”. */
export function formatFreeAtTime(value?: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
