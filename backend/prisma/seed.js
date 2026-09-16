import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  Role,
  LabStatus,
  EquipmentStatus,
  ReservationStatus,
  IncidentStatus,
  IncidentSeverity,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const teacherHash = await bcrypt.hash('Teacher123!', 10);
  const studentHash = await bcrypt.hash('Student123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexolab.edu' },
    update: {},
    create: {
      email: 'admin@nexolab.edu',
      passwordHash,
      fullName: 'Administrador NexoLab',
      role: Role.ADMIN,
      phone: '8180000001',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'docente@nexolab.edu' },
    update: {},
    create: {
      email: 'docente@nexolab.edu',
      passwordHash: teacherHash,
      fullName: 'Dra. Ana Rivera',
      role: Role.TEACHER,
      phone: '8180000002',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'alumno@nexolab.edu' },
    update: {},
    create: {
      email: 'alumno@nexolab.edu',
      passwordHash: studentHash,
      fullName: 'Carlos Mendoza',
      role: Role.STUDENT,
      studentId: '1845123',
      phone: '8180000003',
    },
  });

  const subjectNet = await prisma.subject.upsert({
    where: { code: 'TC2005B' },
    update: {},
    create: {
      code: 'TC2005B',
      name: 'Redes y Cómputo Distribuido',
      description: 'Prácticas de redes, sockets y servicios.',
      credits: 8,
    },
  });

  const subjectWeb = await prisma.subject.upsert({
    where: { code: 'TC3004B' },
    update: {},
    create: {
      code: 'TC3004B',
      name: 'Desarrollo Web Integral',
      description: 'Frontend, backend y bases de datos.',
      credits: 8,
    },
  });

  const labA = await prisma.laboratory.upsert({
    where: { code: 'LAB-A101' },
    update: {},
    create: {
      code: 'LAB-A101',
      name: 'Laboratorio de Redes',
      building: 'Edificio A',
      floor: '1',
      capacity: 24,
      status: LabStatus.AVAILABLE,
      description: 'Switch, routers y estaciones de práctica.',
    },
  });

  const labB = await prisma.laboratory.upsert({
    where: { code: 'LAB-B220' },
    update: {},
    create: {
      code: 'LAB-B220',
      name: 'Laboratorio de Software',
      building: 'Edificio B',
      floor: '2',
      capacity: 30,
      status: LabStatus.AVAILABLE,
      description: 'PCs con stack de desarrollo web.',
    },
  });

  const eq1 = await prisma.equipment.upsert({
    where: { inventoryCode: 'EQ-RTR-001' },
    update: {},
    create: {
      inventoryCode: 'EQ-RTR-001',
      name: 'Router Cisco 2911',
      category: 'Networking',
      status: EquipmentStatus.AVAILABLE,
      laboratoryId: labA.id,
    },
  });

  const eq2 = await prisma.equipment.upsert({
    where: { inventoryCode: 'EQ-SW-002' },
    update: {},
    create: {
      inventoryCode: 'EQ-SW-002',
      name: 'Switch Catalyst 2960',
      category: 'Networking',
      status: EquipmentStatus.AVAILABLE,
      laboratoryId: labA.id,
    },
  });

  const eq3 = await prisma.equipment.upsert({
    where: { inventoryCode: 'EQ-PC-010' },
    update: {},
    create: {
      inventoryCode: 'EQ-PC-010',
      name: 'PC Desarrollo 10',
      category: 'Workstation',
      status: EquipmentStatus.AVAILABLE,
      laboratoryId: labB.id,
    },
  });

  // Reserva de docente (1 maestro puede apartar)
  const starts = new Date();
  starts.setDate(starts.getDate() + 1);
  starts.setHours(10, 0, 0, 0);
  const ends = new Date(starts);
  ends.setHours(12, 0, 0, 0);

  const existing = await prisma.reservation.findFirst({
    where: { title: 'Práctica VLAN' },
  });

  let reservationId = existing?.id;
  if (!existing) {
    const reservation = await prisma.reservation.create({
      data: {
        userId: teacher.id,
        laboratoryId: labA.id,
        subjectId: subjectNet.id,
        title: 'Práctica VLAN',
        purpose: 'Configuración de VLANs y trunking.',
        startsAt: starts,
        endsAt: ends,
        attendees: 18,
        status: ReservationStatus.CONFIRMED,
        reservationEquipment: {
          create: [
            { equipmentId: eq1.id, quantity: 1 },
            { equipmentId: eq2.id, quantity: 1 },
          ],
        },
      },
    });
    reservationId = reservation.id;
  }

  const openIncident = await prisma.incident.findFirst({
    where: { title: 'Router sin PoE' },
  });
  if (!openIncident) {
    await prisma.incident.create({
      data: {
        title: 'Router sin PoE',
        description: 'El puerto PoE del router no alimenta el access point.',
        status: IncidentStatus.OPEN,
        severity: IncidentSeverity.HIGH,
        laboratoryId: labA.id,
        equipmentId: eq1.id,
        reportedById: student.id,
      },
    });
  }

  // Reserva de alumno (REGLA: al menos 10 solicitantes/asistentes)
  const webStarts = new Date();
  webStarts.setDate(webStarts.getDate() + 2);
  webStarts.setHours(14, 0, 0, 0);
  const webEnds = new Date(webStarts);
  webEnds.setHours(16, 0, 0, 0);

  const webRes = await prisma.reservation.findFirst({
    where: { title: 'Sprint Frontend' },
  });
  if (!webRes) {
    await prisma.reservation.create({
      data: {
        userId: student.id,
        laboratoryId: labB.id,
        subjectId: subjectWeb.id,
        title: 'Sprint Frontend',
        purpose: 'Sesión grupal de integración React + API.',
        startsAt: webStarts,
        endsAt: webEnds,
        attendees: 10, // Cumple regla de >= 10 solicitantes para alumnos
        status: ReservationStatus.PENDING,
        reservationEquipment: {
          create: [{ equipmentId: eq3.id, quantity: 1 }],
        },
      },
    });
  }

  // Reportes oficiales generados por Maestro y Administrador (visibles por alumnos)
  const reportTeacher = await prisma.report.findFirst({
    where: { title: 'Informe de Prácticas Redes Q1' },
  });
  if (!reportTeacher) {
    await prisma.report.create({
      data: {
        title: 'Informe de Prácticas Redes Q1',
        type: 'OCCUPANCY',
        summary: 'Alta demanda en el laboratorio de redes durante el primer bloque del semestre.',
        notes: 'Se sugiere programar mantenimiento preventivo a los switches Catalyst.',
        laboratoryId: labA.id,
        createdById: teacher.id,
      },
    });
  }

  const reportAdmin = await prisma.report.findFirst({
    where: { title: 'Auditoría de Infraestructura y Altas de Laboratorios' },
  });
  if (!reportAdmin) {
    await prisma.report.create({
      data: {
        title: 'Auditoría de Infraestructura y Altas de Laboratorios',
        type: 'GENERAL',
        summary: 'Revisión semestral del estado operativo de los laboratorios y capacidad instalada.',
        notes: 'Se mantiene supervisión estricta de altas/bajas de salas y control de ocupación.',
        laboratoryId: labB.id,
        createdById: admin.id,
      },
    });
  }

  console.log('Seed NexoLab MongoDB listo');
  console.log({ admin: admin.email, teacher: teacher.email, student: student.email, reservationId });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
