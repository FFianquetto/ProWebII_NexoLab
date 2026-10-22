/** Rutas de la aplicación — fuente única para navegación y rúbrica. */
export const publicRoutes = {
  login: '/login',
  register: '/register',
} as const;

export const appRoutes = {
  panel: '/',
  laboratories: '/laboratories',
  equipment: '/equipment',
  reservations: '/reservations',
  reservationEquipment: '/reservation-equipment',
  incidents: '/incidents',
  users: '/users',
  reports: '/reports',
} as const;

export type AppRoutePath = (typeof appRoutes)[keyof typeof appRoutes];
