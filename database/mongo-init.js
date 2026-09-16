/**
 * NexoLab - Script de inicialización para MongoDB (Mongosh o MongoDB Compass)
 * Crea la base de datos 'nexolab' y define las colecciones e índices correspondientes.
 */

const dbName = 'nexolab';
const dbInstance = db.getSiblingDB(dbName);

// 1. Colección: users
dbInstance.createCollection('users');
dbInstance.users.createIndex({ email: 1 }, { unique: true });
dbInstance.users.createIndex({ role: 1 });

// 2. Colección: subjects
dbInstance.createCollection('subjects');
dbInstance.subjects.createIndex({ code: 1 }, { unique: true });

// 3. Colección: laboratories
dbInstance.createCollection('laboratories');
dbInstance.laboratories.createIndex({ code: 1 }, { unique: true });
dbInstance.laboratories.createIndex({ status: 1 });

// 4. Colección: equipment
dbInstance.createCollection('equipment');
dbInstance.equipment.createIndex({ inventory_code: 1 }, { unique: true });
dbInstance.equipment.createIndex({ laboratory_id: 1 });

// 5. Colección: reservations
dbInstance.createCollection('reservations');
dbInstance.reservations.createIndex({ user_id: 1 });
dbInstance.reservations.createIndex({ laboratory_id: 1 });
dbInstance.reservations.createIndex({ starts_at: 1, ends_at: 1 });
dbInstance.reservations.createIndex({ status: 1 });

// 6. Colección: reservation_equipment
dbInstance.createCollection('reservation_equipment');
dbInstance.reservation_equipment.createIndex({ reservation_id: 1, equipment_id: 1 }, { unique: true });

// 7. Colección: incidents
dbInstance.createCollection('incidents');
dbInstance.incidents.createIndex({ laboratory_id: 1 });
dbInstance.incidents.createIndex({ equipment_id: 1 });
dbInstance.incidents.createIndex({ reported_by_id: 1 });

// 8. Colección: reports (Reportes oficiales generados por maestros/administradores)
dbInstance.createCollection('reports');
dbInstance.reports.createIndex({ created_by_id: 1 });
dbInstance.reports.createIndex({ laboratory_id: 1 });
dbInstance.reports.createIndex({ created_at: -1 });

print('Base de datos nexolab y 8 colecciones inicializadas con índices.');
