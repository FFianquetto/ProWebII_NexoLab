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
  incidentSchema,
  reportSchema,
} from '../validators/schemas.js';

const router = Router();

// Rutas públicas de autenticación
router.post('/auth/register', validate(registerSchema), auth.register);
router.post('/auth/login', validate(loginSchema), auth.login);

// Todas las rutas siguientes requieren token JWT
router.use(authenticate);

router.get('/auth/me', auth.me);

// Usuarios
router.get('/users', users.list);
router.get('/users/:id', users.getById);
router.post('/users', authorize('ADMIN'), validate(registerSchema), users.create);
router.put('/users/:id', authorize('ADMIN'), validate(userUpdateSchema), users.update);
router.delete('/users/:id', authorize('ADMIN'), users.remove);

// Materias
router.get('/subjects', subjects.list);
router.get('/subjects/:id', subjects.getById);
router.post('/subjects', authorize('ADMIN', 'TEACHER'), validate(subjectSchema), subjects.create);
router.put('/subjects/:id', authorize('ADMIN', 'TEACHER'), validate(subjectSchema.partial()), subjects.update);
router.delete('/subjects/:id', authorize('ADMIN'), subjects.remove);

// Laboratorios:
// REGLA: El administrador se encarga de dar de alta o baja laboratorios y llevar el control
router.get('/laboratories', laboratories.list);
router.get('/laboratories/:id', laboratories.getById);
router.post('/laboratories', authorize('ADMIN'), validate(laboratorySchema), laboratories.create);
router.put('/laboratories/:id', authorize('ADMIN'), validate(laboratorySchema.partial()), laboratories.update);
router.delete('/laboratories/:id', authorize('ADMIN'), laboratories.remove);

// Equipos
router.get('/equipment', equipment.list);
router.get('/equipment/:id', equipment.getById);
router.post('/equipment', authorize('ADMIN'), validate(equipmentSchema), equipment.create);
router.put('/equipment/:id', authorize('ADMIN'), validate(equipmentSchema.partial()), equipment.update);
router.delete('/equipment/:id', authorize('ADMIN'), equipment.remove);

// Reservas:
// REGLA: Alumnos requieren mínimo 10 solicitantes; Maestros pueden solicitar con 1; Admin lleva el control
router.get('/reservations', reservations.list);
router.get('/reservations/:id', reservations.getById);
router.post('/reservations', validate(reservationSchema), reservations.create);
router.put('/reservations/:id', validate(reservationUpdateSchema), reservations.update);
router.delete('/reservations/:id', reservations.remove);

// Asignación de equipos a reservas
router.get('/reservation-equipment', reservationEquipment.list);
router.get('/reservation-equipment/:id', reservationEquipment.getById);
router.post('/reservation-equipment', validate(reservationEquipmentSchema), reservationEquipment.create);
router.put('/reservation-equipment/:id', validate(reservationEquipmentSchema.partial()), reservationEquipment.update);
router.delete('/reservation-equipment/:id', reservationEquipment.remove);

// Incidencias
router.get('/incidents', incidents.list);
router.get('/incidents/:id', incidents.getById);
router.post('/incidents', validate(incidentSchema), incidents.create);
router.put('/incidents/:id', validate(incidentSchema.partial()), incidents.update);
router.delete('/incidents/:id', incidents.remove);

// Reportes:
// REGLA: Los alumnos pueden VERLOS (GET), pero sólo Maestros o Administradores pueden HACERLOS (POST / DELETE)
router.get('/reports', reports.summary);
router.post('/reports', authorize('ADMIN', 'TEACHER'), validate(reportSchema), reports.create);
router.delete('/reports/:id', authorize('ADMIN', 'TEACHER'), reports.remove);

export default router;
