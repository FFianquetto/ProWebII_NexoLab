import type { Role } from '../types';
import { appRoutes, type AppRoutePath } from '../constants/routes';

/** Roles permitidos por ruta de la app. Si no aparece, la ruta es pública autenticada. */
export const routeRoles: Partial<Record<AppRoutePath, Role[]>> = {
  [appRoutes.panel]: ['ADMIN'],
  [appRoutes.users]: ['ADMIN'],
  /** Inventario / labs / reservas: todos autenticados. Préstamo solo alumno/docente. */
  [appRoutes.reservationEquipment]: ['TEACHER', 'STUDENT'],
};

export function canAccessRoute(role: Role | undefined, path: string): boolean {
  if (!role) return false;
  const allowed = routeRoles[path as AppRoutePath];
  if (!allowed) return true;
  return allowed.includes(role);
}

/** Home por rol (evita mandar alumnos/docentes al Panel). */
export function homeForRole(role: Role | undefined): string {
  if (role === 'ADMIN') return appRoutes.panel;
  return appRoutes.reservations;
}

export function isAdmin(role?: Role | null) {
  return role === 'ADMIN';
}

export function isTeacher(role?: Role | null) {
  return role === 'TEACHER';
}

export function isStudent(role?: Role | null) {
  return role === 'STUDENT';
}
