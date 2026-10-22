import 'dotenv/config';
import dns from 'node:dns';
import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  Role,
  LabStatus,
  EquipmentStatus,
  ReservationStatus,
  IncidentStatus,
  IncidentSeverity,
  IncidentKind,
} from '@prisma/client';

dns.setDefaultResultOrder('ipv4first');

const prisma = new PrismaClient();

async function upsertUser({ email, password, fullName, role, studentId, phone }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      fullName,
      role,
      studentId: studentId || null,
      phone: phone || null,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      fullName,
      role,
      studentId: studentId || null,
      phone: phone || null,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    email: 'admin@nexolab.edu',
    password: 'Admin123!',
    fullName: 'Administrador NexoLab',
    role: Role.ADMIN,
    phone: '8180000001',
  });

  const teacher = await upsertUser({
    email: 'docente@nexolab.edu',
    password: 'Teacher123!',
    fullName: 'Dra. Ana Rivera',
    role: Role.TEACHER,
    phone: '8180000002',
  });

  const student = await upsertUser({
    email: 'alumno@nexolab.edu',
    password: 'Student123!',
    fullName: 'Carlos Mendoza',
    role: Role.STUDENT,
    studentId: '1845123',
    phone: '8180000003',
  });

  const student2 = await upsertUser({
    email: 'alumno2@nexolab.edu',
    password: 'Student123!',
    fullName: 'María López',
    role: Role.STUDENT,
    studentId: '1845124',
    phone: '8180000004',
  });

  const student3 = await upsertUser({
    email: 'alumno3@nexolab.edu',
    password: 'Student123!',
    fullName: 'Luis Hernández',
    role: Role.STUDENT,
    studentId: '1845125',
    phone: '8180000005',
  });

  const student4 = await upsertUser({
    email: 'alumno4@nexolab.edu',
    password: 'Student123!',
    fullName: 'Sofía Ramírez',
    role: Role.STUDENT,
    studentId: '1845126',
    phone: '8180000006',
  });

  const student5 = await upsertUser({
    email: 'alumno5@nexolab.edu',
    password: 'Student123!',
    fullName: 'Diego Torres',
    role: Role.STUDENT,
    studentId: '1845127',
    phone: '8180000007',
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

  const subjectDb = await prisma.subject.upsert({
    where: { code: 'TC2026' },
    update: {},
    create: {
      code: 'TC2026',
      name: 'Bases de Datos Avanzadas',
      description: 'Modelado, consultas y optimización.',
      credits: 6,
    },
  });

  // 12 laboratorios (capacidad entre 20 y 30)
  const labDefs = [
    { code: 'LAB-A101', name: 'Laboratorio de Redes', building: 'Edificio A', floor: '1', capacity: 24, status: LabStatus.AVAILABLE, description: 'Switch, routers y estaciones de práctica.' },
    { code: 'LAB-B220', name: 'Laboratorio de Software', building: 'Edificio B', floor: '2', capacity: 30, status: LabStatus.AVAILABLE, description: 'PCs con stack de desarrollo web.' },
    { code: 'LAB-C305', name: 'Laboratorio de Bases de Datos', building: 'Edificio C', floor: '3', capacity: 28, status: LabStatus.AVAILABLE, description: 'Servidores locales y estaciones SQL.' },
    { code: 'LAB-D110', name: 'Laboratorio de Ciberseguridad', building: 'Edificio D', floor: '1', capacity: 20, status: LabStatus.MAINTENANCE, description: 'Mantenimiento preventivo de firewalls.' },
    { code: 'LAB-E201', name: 'Laboratorio de IoT', building: 'Edificio E', floor: '2', capacity: 22, status: LabStatus.AVAILABLE, description: 'Sensores, microcontroladores y gateways.' },
    { code: 'LAB-F150', name: 'Laboratorio de Multimedia', building: 'Edificio F', floor: '1', capacity: 26, status: LabStatus.AVAILABLE, description: 'Estaciones con GPU para edición y render.' },
    { code: 'LAB-G310', name: 'Laboratorio de Sistemas Operativos', building: 'Edificio G', floor: '3', capacity: 28, status: LabStatus.AVAILABLE, description: 'Máquinas dual-boot y virtualización.' },
    { code: 'LAB-H120', name: 'Laboratorio de Electrónica Digital', building: 'Edificio H', floor: '1', capacity: 20, status: LabStatus.AVAILABLE, description: 'FPGA, protoboards y osciloscopios.' },
    { code: 'LAB-I240', name: 'Laboratorio de Inteligencia Artificial', building: 'Edificio I', floor: '2', capacity: 24, status: LabStatus.AVAILABLE, description: 'Workstations con aceleración GPU.' },
    { code: 'LAB-J105', name: 'Laboratorio de Cloud Computing', building: 'Edificio J', floor: '1', capacity: 20, status: LabStatus.AVAILABLE, description: 'Nodos locales y acceso a nubes educativas.' },
    { code: 'LAB-K330', name: 'Laboratorio de Robótica', building: 'Edificio K', floor: '3', capacity: 22, status: LabStatus.AVAILABLE, description: 'Kits móviles y brazos robóticos.' },
    { code: 'LAB-L210', name: 'Laboratorio de Realidad Virtual', building: 'Edificio L', floor: '2', capacity: 20, status: LabStatus.CLOSED, description: 'Sala de headsets y tracking espacial.' },
  ];

  const labs = [];
  for (const def of labDefs) {
    const lab = await prisma.laboratory.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        building: def.building,
        floor: def.floor,
        capacity: def.capacity,
        status: def.status,
        description: def.description,
      },
      create: def,
    });
    labs.push(lab);
  }

  const [labA, labB, labC, labD, labE, labF, labG, labH, labI, labJ, labK, labL] = labs;

  // 24 equipos de préstamo individual: 6 Computadoras, 6 Cascos VR, 6 Bocinas, 6 Multímetros
  const loanCatalog = [
    ...Array.from({ length: 6 }, (_, i) => ({
      category: 'Computadora',
      name: `Computadora Dell OptiPlex ${i + 1}`,
      inventoryCode: `EQ-PC-${String(i + 1).padStart(3, '0')}`,
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      category: 'Casco VR',
      name: `Casco VR Meta Quest ${i + 1}`,
      inventoryCode: `EQ-VR-${String(i + 1).padStart(3, '0')}`,
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      category: 'Bocina',
      name: `Bocina JBL Charge ${i + 1}`,
      inventoryCode: `EQ-SPK-${String(i + 1).padStart(3, '0')}`,
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      category: 'Multímetro',
      name: `Multímetro Fluke ${i + 1}`,
      inventoryCode: `EQ-MUL-${String(i + 1).padStart(3, '0')}`,
    })),
  ];

  const electronics = [];
  for (let i = 0; i < loanCatalog.length; i += 1) {
    const def = loanCatalog[i];
    const lab = labs[i % labs.length];
    const eq = await prisma.equipment.upsert({
      where: { inventoryCode: def.inventoryCode },
      update: {
        name: def.name,
        category: def.category,
        status: EquipmentStatus.AVAILABLE,
        laboratoryId: lab.id,
        notes: 'Préstamo individual 1 a 1 (máx. 1 por persona).',
      },
      create: {
        inventoryCode: def.inventoryCode,
        name: def.name,
        category: def.category,
        status: EquipmentStatus.AVAILABLE,
        laboratoryId: lab.id,
        notes: 'Préstamo individual 1 a 1 (máx. 1 por persona).',
      },
    });
    electronics.push(eq);
  }

  // Marca como MAINTENANCE los EQ-ELC-* legacy para que no aparezcan como disponibles
  await prisma.equipment.updateMany({
    where: { inventoryCode: { startsWith: 'EQ-ELC-' } },
    data: { status: EquipmentStatus.MAINTENANCE },
  });

  // Equipos legacy no electrónicos (para catálogo general)
  const eqNet1 = await prisma.equipment.upsert({
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

  const eqPc = await prisma.equipment.upsert({
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

  async function ensureReservation({
    title,
    userId,
    laboratoryId,
    subjectId,
    purpose,
    dayOffset,
    startHour,
    endHour,
    attendees,
    status,
    equipment,
  }) {
    const existing = await prisma.reservation.findFirst({ where: { title } });
    if (existing) return existing;

    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + dayOffset);
    startsAt.setHours(startHour, 0, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setHours(endHour, 0, 0, 0);

    return prisma.reservation.create({
      data: {
        userId,
        laboratoryId,
        subjectId: subjectId || null,
        title,
        purpose,
        startsAt,
        endsAt,
        attendees,
        status,
        reservationEquipment: equipment?.length ? { create: equipment } : undefined,
      },
    });
  }

  // Reservas demo con equipo electrónico (1 por alumno)
  await ensureReservation({
    title: 'Práctica VLAN',
    userId: teacher.id,
    laboratoryId: labA.id,
    subjectId: subjectNet.id,
    purpose: 'Configuración de VLANs y trunking.',
    dayOffset: 1,
    startHour: 10,
    endHour: 12,
    attendees: 18,
    status: ReservationStatus.CONFIRMED,
    equipment: [
      { equipmentId: electronics[0].id, quantity: 1 },
    ],
  });

  await ensureReservation({
    title: 'Sprint Frontend',
    userId: student.id,
    laboratoryId: labB.id,
    subjectId: subjectWeb.id,
    purpose: 'Sesión de integración React + API.',
    dayOffset: 2,
    startHour: 14,
    endHour: 16,
    attendees: 1,
    status: ReservationStatus.PENDING,
    equipment: [{ equipmentId: electronics[1].id, quantity: 1 }],
  });

  await ensureReservation({
    title: 'Consulta SQL avanzada',
    userId: teacher.id,
    laboratoryId: labC.id,
    subjectId: subjectDb.id,
    purpose: 'Índices, joins y planes de ejecución.',
    dayOffset: 3,
    startHour: 9,
    endHour: 11,
    attendees: 22,
    status: ReservationStatus.CONFIRMED,
    equipment: [{ equipmentId: electronics[2].id, quantity: 1 }],
  });

  await ensureReservation({
    title: 'Hackathon interno',
    userId: student.id,
    laboratoryId: labB.id,
    subjectId: subjectWeb.id,
    purpose: 'Prototipo full-stack en equipo.',
    dayOffset: 4,
    startHour: 16,
    endHour: 18,
    attendees: 1,
    status: ReservationStatus.PENDING,
  });

  async function ensureIncident(data) {
    const existing = await prisma.incident.findFirst({ where: { title: data.title } });
    if (existing) return existing;
    return prisma.incident.create({ data });
  }

  await ensureIncident({
    title: 'Laptop sin carga',
    description: 'EQ-ELC-001 no sostiene batería más de 20 minutos.',
    kind: IncidentKind.EQUIPMENT,
    status: IncidentStatus.OPEN,
    severity: IncidentSeverity.HIGH,
    laboratoryId: labA.id,
    equipmentId: electronics[0].id,
    reportedById: student.id,
  });

  await ensureIncident({
    title: 'Tablet con pantalla rota',
    description: 'Grieta en esquina superior derecha.',
    kind: IncidentKind.EQUIPMENT,
    status: IncidentStatus.IN_PROGRESS,
    severity: IncidentSeverity.MEDIUM,
    laboratoryId: labB.id,
    equipmentId: electronics[1].id,
    reportedById: student.id,
  });

  await ensureIncident({
    title: 'Aire acondicionado ruidoso',
    description: 'Ruido excesivo en LAB-C305 durante prácticas.',
    kind: IncidentKind.LABORATORY,
    status: IncidentStatus.RESOLVED,
    severity: IncidentSeverity.LOW,
    laboratoryId: labC.id,
    equipmentId: null,
    reportedById: teacher.id,
    resolvedAt: new Date(),
  });

  async function ensureReport(data) {
    const existing = await prisma.report.findFirst({ where: { title: data.title } });
    if (existing) return existing;
    return prisma.report.create({ data });
  }

  await ensureReport({
    title: 'Informe de Prácticas Redes Q1',
    type: 'OCCUPANCY',
    summary: 'Alta demanda en el laboratorio de redes durante el primer bloque del semestre.',
    notes: 'Se sugiere programar mantenimiento preventivo.',
    laboratoryId: labA.id,
    createdById: teacher.id,
  });

  await ensureReport({
    title: 'Auditoría de Infraestructura',
    type: 'GENERAL',
    summary: 'Revisión semestral del estado operativo de los 12 laboratorios.',
    notes: 'Inventario de 24 equipos electrónicos listo para préstamo.',
    laboratoryId: labB.id,
    createdById: admin.id,
  });

  await ensureReport({
    title: 'Uso de equipo electrónico',
    type: 'EQUIPMENT',
    summary: 'Regla activa: 1 equipo electrónico por alumno por solicitud.',
    notes: 'Monitorear liberaciones al cerrar reservas.',
    laboratoryId: labB.id,
    createdById: teacher.id,
  });

  // Silenciar vars no usadas (labs extras quedan en DB)
  void [labD, labE, labF, labG, labH, labI, labJ, labK, labL, eqNet1, eqPc, student2, student3, student4, student5];

  console.log('Seed NexoLab listo: 12 laboratorios + 24 equipos electrónicos + 5 alumnos');
  console.log({
    admin: 'admin@nexolab.edu / Admin123!',
    docente: 'docente@nexolab.edu / Teacher123!',
    alumno: 'alumno@nexolab.edu / Student123!',
    alumno2: 'alumno2@nexolab.edu / Student123!',
    alumno3: 'alumno3@nexolab.edu / Student123!',
    alumno4: 'alumno4@nexolab.edu / Student123!',
    alumno5: 'alumno5@nexolab.edu / Student123!',
    laboratorios: labs.length,
    equiposElectronicos: electronics.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
