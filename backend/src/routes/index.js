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
import { authenticate } from '../middleware/auth.js';
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
} from '../validators/schemas.js';

const router = Router();

router.post('/auth/register', validate(registerSchema), auth.register);
router.post('/auth/login', validate(loginSchema), auth.login);

router.use(authenticate);

router.get('/auth/me', auth.me);

router.get('/users', users.list);
router.get('/users/:id', users.getById);
router.post('/users', validate(registerSchema), users.create);
router.put('/users/:id', validate(userUpdateSchema), users.update);
router.delete('/users/:id', users.remove);

router.get('/subjects', subjects.list);
router.get('/subjects/:id', subjects.getById);
router.post('/subjects', validate(subjectSchema), subjects.create);
router.put('/subjects/:id', validate(subjectSchema.partial()), subjects.update);
router.delete('/subjects/:id', subjects.remove);

router.get('/laboratories', laboratories.list);
router.get('/laboratories/:id', laboratories.getById);
router.post('/laboratories', validate(laboratorySchema), laboratories.create);
router.put('/laboratories/:id', validate(laboratorySchema.partial()), laboratories.update);
router.delete('/laboratories/:id', laboratories.remove);

router.get('/equipment', equipment.list);
router.get('/equipment/:id', equipment.getById);
router.post('/equipment', validate(equipmentSchema), equipment.create);
router.put('/equipment/:id', validate(equipmentSchema.partial()), equipment.update);
router.delete('/equipment/:id', equipment.remove);

router.get('/reservations', reservations.list);
router.get('/reservations/:id', reservations.getById);
router.post('/reservations', validate(reservationSchema), reservations.create);
router.put('/reservations/:id', validate(reservationUpdateSchema), reservations.update);
router.delete('/reservations/:id', reservations.remove);

router.get('/reservation-equipment', reservationEquipment.list);
router.get('/reservation-equipment/:id', reservationEquipment.getById);
router.post('/reservation-equipment', validate(reservationEquipmentSchema), reservationEquipment.create);
router.put('/reservation-equipment/:id', validate(reservationEquipmentSchema.partial()), reservationEquipment.update);
router.delete('/reservation-equipment/:id', reservationEquipment.remove);

router.get('/incidents', incidents.list);
router.get('/incidents/:id', incidents.getById);
router.post('/incidents', validate(incidentSchema), incidents.create);
router.put('/incidents/:id', validate(incidentSchema.partial()), incidents.update);
router.delete('/incidents/:id', incidents.remove);

router.get('/reports', reports.summary);

export default router;
