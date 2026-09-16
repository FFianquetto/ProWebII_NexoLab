export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  studentId?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  credits: number;
  isActive: boolean;
}

export interface Laboratory {
  id: string;
  code: string;
  name: string;
  building: string;
  floor?: string | null;
  capacity: number;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'CLOSED';
  description?: string | null;
  _count?: { equipment: number; reservations: number };
}

export interface Equipment {
  id: string;
  inventoryCode: string;
  name: string;
  category: string;
  status: 'AVAILABLE' | 'IN_USE' | 'BROKEN' | 'MAINTENANCE';
  laboratoryId: string;
  notes?: string | null;
  laboratory?: { id: string; code: string; name: string };
}

export interface Reservation {
  id: string;
  userId: string;
  laboratoryId: string;
  subjectId?: string | null;
  title: string;
  purpose?: string | null;
  startsAt: string;
  endsAt: string;
  attendees: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  user?: Pick<User, 'id' | 'fullName' | 'email' | 'role'>;
  laboratory?: Pick<Laboratory, 'id' | 'code' | 'name' | 'capacity'>;
  subject?: Pick<Subject, 'id' | 'code' | 'name'> | null;
  reservationEquipment?: Array<{
    id: string;
    quantity: number;
    equipment: { id: string; inventoryCode: string; name: string };
  }>;
}

export interface ReservationEquipment {
  id: string;
  reservationId: string;
  equipmentId: string;
  quantity: number;
  reservation?: { id: string; title: string; startsAt: string; endsAt: string };
  equipment?: { id: string; inventoryCode: string; name: string };
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  laboratoryId?: string | null;
  equipmentId?: string | null;
  reportedById: string;
  resolvedAt?: string | null;
  laboratory?: { id: string; code: string; name: string } | null;
  equipment?: { id: string; inventoryCode: string; name: string } | null;
  reportedBy?: { id: string; fullName: string; email: string; role?: Role };
}

export interface Report {
  id: string;
  title: string;
  type: 'GENERAL' | 'INCIDENTS' | 'OCCUPANCY' | 'EQUIPMENT';
  summary: string;
  notes?: string | null;
  laboratoryId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: Pick<User, 'id' | 'fullName' | 'email' | 'role'>;
  laboratory?: Pick<Laboratory, 'id' | 'code' | 'name'> | null;
}

export interface ReportsData {
  kpis: {
    laboratories: number;
    equipment: number;
    activeReservations: number;
    openIncidents: number;
    activeUsers: number;
    generatedReports?: number;
  };
  occupancyByLab: Array<Record<string, string | number>>;
  topEquipment: Array<Record<string, string | number>>;
  incidentsByStatus: Array<Record<string, string | number>>;
  reservationsByHour: Array<Record<string, string | number>>;
  savedReports?: Report[];
}
