export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: number;
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
  id: number;
  code: string;
  name: string;
  description?: string | null;
  credits: number;
  isActive: boolean;
}

export interface Laboratory {
  id: number;
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
  id: number;
  inventoryCode: string;
  name: string;
  category: string;
  status: 'AVAILABLE' | 'IN_USE' | 'BROKEN' | 'MAINTENANCE';
  laboratoryId: number;
  notes?: string | null;
  laboratory?: { id: number; code: string; name: string };
}

export interface Reservation {
  id: number;
  userId: number;
  laboratoryId: number;
  subjectId?: number | null;
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
    id: number;
    quantity: number;
    equipment: { id: number; inventoryCode: string; name: string };
  }>;
}

export interface ReservationEquipment {
  id: number;
  reservationId: number;
  equipmentId: number;
  quantity: number;
  reservation?: { id: number; title: string; startsAt: string; endsAt: string };
  equipment?: { id: number; inventoryCode: string; name: string };
}

export interface Incident {
  id: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  laboratoryId?: number | null;
  equipmentId?: number | null;
  reportedById: number;
  resolvedAt?: string | null;
  laboratory?: { id: number; code: string; name: string } | null;
  equipment?: { id: number; inventoryCode: string; name: string } | null;
  reportedBy?: { id: number; fullName: string; email: string };
}

export interface ReportsData {
  kpis: {
    laboratories: number;
    equipment: number;
    activeReservations: number;
    openIncidents: number;
    activeUsers: number;
  };
  occupancyByLab: Array<Record<string, string | number>>;
  topEquipment: Array<Record<string, string | number>>;
  incidentsByStatus: Array<Record<string, string | number>>;
  reservationsByHour: Array<Record<string, string | number>>;
}
