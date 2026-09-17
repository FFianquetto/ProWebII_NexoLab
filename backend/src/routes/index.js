import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import * as users from '../controllers/usersController.js';
import * as subjects from '../controllers/subjectsController.js';
import * as laboratories from '../controllers/laboratoriesController.js';
import * as equipment from '../controllers/equipmentController.js';
import * as reservations from '../controllers/reservationsController.js';
import * as reservationEquipment from '../controllers/reservationEquipmentController.js';
import * as incidents from '../controllers/incidentsController.js';
import * as reports from '../controllers/reportsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  userUpdateSchema,
  subjectSchema,
  laboratorySchema,
  equipmentSchema,
  reservationSchema,
  reservationUpdateSchema,
  reservationEquipmentSchema,
  reservationEquipmentUpdateSchema,
  incidentSchema,
  incidentUpdateSchema,
  reportSchema,
  reportUpdateSchema,
  idParamSchema,
} from '../validators/schemas.js';

const router = Router();
const validateId = validate(idParamSchema, 'params');

// Rutas públicas de autenticación
router.post('/auth/register', validate(registerSchema), auth.register);
router.post('/auth/login', validate(loginSchema), auth.login);

// Todas las rutas siguientes requieren token JWT
router.use(authenticate);

router.get('/auth/me', auth.me);

// Usuarios
router.get('/users', users.list);
router.get('/users/:id', validateId, users.getById);
router.post('/users', authorize('ADMIN'), validate(registerSchema), users.create);
router.put('/users/:id', authorize('ADMIN'), validateId, validate(userUpdateSchema), users.update);
router.delete('/users/:id', authorize('ADMIN'), validateId, users.remove);

// Materias
router.get('/subjects', subjects.list);
router.get('/subjects/:id', validateId, subjects.getById);
router.post('/subjects', authorize('ADMIN', 'TEACHER'), validate(subjectSchema), subjects.create);
router.put('/subjects/:id', authorize('ADMIN', 'TEACHER'), validateId, validate(subjectSchema.partial()), subjects.update);
router.delete('/subjects/:id', authorize('ADMIN'), validateId, subjects.remove);

// Laboratorios:
// REGLA: El administrador se encarga de dar de alta o baja laboratorios y llevar el control
router.get('/laboratories', laboratories.list);
router.get('/laboratories/:id', validateId, laboratories.getById);
router.post('/laboratories', authorize('ADMIN'), validate(laboratorySchema), laboratories.create);
router.put('/laboratories/:id', authorize('ADMIN'), validateId, validate(laboratorySchema.partial()), laboratories.update);
router.delete('/laboratories/:id', authorize('ADMIN'), validateId, laboratories.remove);

// Equipos
router.get('/equipment', equipment.list);
router.get('/equipment/:id', validateId, equipment.getById);
router.post('/equipment', authorize('ADMIN'), validate(equipmentSchema), equipment.create);
router.put('/equipment/:id', authorize('ADMIN'), validateId, validate(equipmentSchema.partial()), equipment.update);
router.delete('/equipment/:id', authorize('ADMIN'), validateId, equipment.remove);

// Reservas:
// Maestro: reserva directa con asistentes. Alumno: 1 solicitud; se confirman al reunir 5 en mismo lab/horario.
router.get('/reservations', reservations.list);
router.get('/reservations/busy', reservations.busySlots);
router.get('/reservations/:id', validateId, reservations.getById);
router.post('/reservations', validate(reservationSchema), reservations.create);
router.put('/reservations/:id', validateId, validate(reservationUpdateSchema), reservations.update);
router.delete('/reservations/:id', validateId, reservations.remove);

// Asignación de equipos a reservas (préstamo 1 a 1 por categoría)
router.get('/reservation-equipment', reservationEquipment.list);
router.get('/reservation-equipment/availability', reservationEquipment.availability);
router.get('/reservation-equipment/:id', validateId, reservationEquipment.getById);
router.post('/reservation-equipment', validate(reservationEquipmentSchema), reservationEquipment.create);
router.put(
  '/reservation-equipment/:id',
  validateId,
  validate(reservationEquipmentUpdateSchema),
  reservationEquipment.update,
);
router.delete('/reservation-equipment/:id', validateId, reservationEquipment.remove);

// Incidencias
router.get('/incidents', incidents.list);
router.get('/incidents/:id', validateId, incidents.getById);
router.post('/incidents', validate(incidentSchema), incidents.create);
router.put('/incidents/:id', validateId, validate(incidentUpdateSchema), incidents.update);
router.delete('/incidents/:id', validateId, incidents.remove);

// Reportes: solo el administrador consulta y gestiona
router.get('/reports', authorize('ADMIN'), reports.summary);
router.get('/reports/:id', authorize('ADMIN'), validateId, reports.getById);
router.post('/reports', authorize('ADMIN'), validate(reportSchema), reports.create);
router.put(
  '/reports/:id',
  authorize('ADMIN'),
  validateId,
  validate(reportUpdateSchema),
  reports.update,
);
router.delete('/reports/:id', authorize('ADMIN'), validateId, reports.remove);

export default router;
