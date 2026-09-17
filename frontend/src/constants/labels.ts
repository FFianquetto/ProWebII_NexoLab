/** Etiquetas en español para UI (los valores de API siguen en inglés). */

export const reportColumnLabels: Record<string, string> = {
  code: 'Código',
  name: 'Nombre',
  capacity: 'Capacidad',
  total_reservations: 'Total de reservas',
  confirmed_or_done: 'Confirmadas / finalizadas',
  no_shows: 'Inasistencias',
  avg_attendees: 'Promedio de asistentes',
  inventoryCode: 'Código de inventario',
  category: 'Categoría',
  laboratoryCode: 'Código de laboratorio',
  times_used: 'Veces usado',
  total_quantity: 'Cantidad total',
  status: 'Estado',
  severity: 'Severidad',
  total: 'Total',
  labs_affected: 'Labs afectados',
  equipment_affected: 'Equipos afectados',
  hour_slot: 'Hora',
  reservations: 'Reservas',
  labs_used: 'Labs usados',
  unique_users: 'Usuarios únicos',
};

export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  TEACHER: 'Docente',
  STUDENT: 'Alumno',
};

export const reportTypeLabels: Record<string, string> = {
  GENERAL: 'General',
  OCCUPANCY: 'Ocupación de espacios',
  INCIDENTS: 'Incidencias y fallas',
  EQUIPMENT: 'Inventario de equipos',
};

export const labStatusLabels: Record<string, string> = {
  AVAILABLE: 'Disponible (funcional)',
  MAINTENANCE: 'Mantenimiento',
  CLOSED: 'Cerrado',
};

export const equipmentStatusLabels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  IN_USE: 'En uso',
  BROKEN: 'Descompuesto',
  MAINTENANCE: 'Mantenimiento',
};

export const reservationStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
};

export const incidentStatusLabels: Record<string, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
};

export const severityLabels: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const incidentKindLabels: Record<string, string> = {
  LABORATORY: 'Laboratorio',
  EQUIPMENT: 'Equipo',
};

export function labelOf(map: Record<string, string>, value?: string | null) {
  if (!value) return '—';
  return map[value] ?? value;
}
