# ProWebII_NexoLab

**NexoLab** — plataforma universitaria para gestionar laboratorios, inventario de equipo, reservas e incidencias.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + TypeScript + **Material UI** |
| Backend | Node.js + Express (API REST JSON) |
| ORM | **Prisma Client** (proveedor `mongodb`) |
| Base de datos | **MongoDB** (MongoDB Atlas online o MongoDB local) |
| Auth | **JWT** Bearer (excepto login y registro) |
| Logs | Winston → `backend/logs/` |

## Estructura del repositorio

```
├── backend/                 # API REST
│   ├── prisma/              # Schema Prisma (MongoDB) + seed
│   ├── src/
│   │   ├── controllers/     # Lógica por recurso y reglas de negocio
│   │   ├── middleware/      # Auth, roles (authorize), validación, errores
│   │   ├── routes/          # Endpoints HTTP
│   │   ├── validators/      # Zod (CREATE/UPDATE/DELETE params)
│   │   ├── lib/             # Prisma client
│   │   └── utils/           # Logger Winston y respuestas estándar
│   └── logs/                # app.log / error.log
├── frontend/                # App React + Material UI
│   └── src/
│       ├── components/      # Layout + CRUD reutilizable (ResourcePage, InfoCard)
│       ├── pages/           # Pantallas / rutas con control de roles
│       ├── context/         # AuthContext (JWT, rol y sesión)
│       ├── api/             # Cliente Axios → Backend
│       └── theme/           # Tokens y paleta Material Design
├── database/
│   └── mongo-init.js        # Script de inicialización e índices para MongoDB
└── README.md
```

## Cumplimiento de rúbrica

| Requisito | Estado |
|-----------|--------|
| ≥ 6 colecciones | 8 colecciones (`users`, `subjects`, `laboratories`, `equipment`, `reservations`, `reservation_equipment`, `incidents`, `reports`) |
| Interacción BD solo vía ORM | Prisma Client con proveedor MongoDB |
| FE no habla con BD; solo Backend JSON | Sí (Arquitectura desacoplada) |
| Reportes ≥ 4 consultas multi-colección / KPIs | `/reports` (Ocupación, Equipos más usados, Incidencias por severidad, Demanda horaria) |
| CRUD GET/POST/PUT/DELETE por entidad | Sí |
| Pantallas CRUD por entidad | Sí (con Material UI) |
| Validaciones backend independientes | Zod en CREATE/UPDATE/DELETE (params) |
| Logs de procesos/excepciones | Winston con pares inicio/fin → `backend/logs/` |
| Login obligatorio + registro público | Sí |
| Token en endpoints privados | JWT Bearer obligatorio |
| UI Material Design system | Material UI (MUI v7) |
| Script de base de datos | `database/mongo-init.js` |

---

## Reglas de Negocio Implementadas

1. **Reservas — Maestros:** pueden apartar un laboratorio de forma directa e indicar el número de asistentes.
2. **Reservas — Alumnos:** cada cuenta cuenta como **1 solicitud**. Se requieren **5 alumnos** pidiendo el mismo laboratorio y horario; una sola cuenta **no** puede poner la cantidad de personas.
3. **Administrador:** lleva el control (Panel, usuarios, laboratorios, reportes). No solicita reservas a su nombre.
4. **Incidencias:** cualquier usuario autenticado puede reportar; el administrador actualiza y da seguimiento.
5. **Reportes e indicadores:** solo visibles y gestionables por el **administrador**.
6. **Visibilidad de menú:** Panel, Usuarios y Reportes → Admin; Asignaciones → Admin/Docente; el resto según rol.

---

## Pantallas y rutas (Frontend)

| Pantalla | Ruta | Descripción y Permisos |
|----------|------|------------------------|
| Login | `/login` | Acceso con correo y contraseña |
| Registro | `/register` | Registro público de nuevos usuarios |
| Panel | `/` | Dashboard general con métricas y próximas reservas |
| Laboratorios | `/laboratories` | Catálogo de salas; altas y bajas exclusivas de Admin |
| Equipos | `/equipment` | Inventario de hardware por laboratorio |
| Reservas | `/reservations` | Agenda de uso (alumnos ≥10 solicitantes, maestros ≥1) |
| Asignaciones | `/reservation-equipment` | Asignación de equipos a reservas |
| Materias | `/subjects` | Catálogo académico de materias |
| Incidencias | `/incidents` | Registro y seguimiento de fallas técnicas |
| Usuarios | `/users` | Gestión de cuentas y roles (Admin) |
| Reportes | `/reports` | Indicadores multi-colección y generación oficial (Maestros/Admin) |

---

## Endpoints (Backend)

Base: `http://localhost:4000/api`

**Públicos:**
- `POST /auth/login`
- `POST /auth/register`
- `GET /health`

**Protegidos (requieren `Authorization: Bearer <token>`):**
- `/laboratories` — GET (todos), POST/PUT/DELETE (`ADMIN`)
- `/reservations` — GET, POST, PUT, DELETE (regla de solicitantes validada en backend)
- `/reports` — GET summary (todos), GET/:id, POST/PUT/DELETE (`ADMIN`, `TEACHER`)
- `/equipment` — GET (todos), POST/PUT/DELETE (`ADMIN`)
- `/reservation-equipment` — CRUD
- `/incidents` — CRUD
- `/subjects` — GET (todos), POST/PUT (`ADMIN`, `TEACHER`), DELETE (`ADMIN`)
- `/users` — GET (todos), POST/PUT/DELETE (`ADMIN`)
- `GET /auth/me`

---

## Configuración de MongoDB

Puedes usar **MongoDB Atlas** (servicio online gratuito en la nube) o un MongoDB local.

### Opción 1: MongoDB Atlas (Servicio Online recomendado)

1. Crea una cuenta gratuita en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Crea un clúster gratuito (M0).
3. En **Database Access**, crea un usuario y contraseña.
4. En **Network Access**, permite el acceso desde tu IP o `0.0.0.0/0`.
5. Obtén tu cadena de conexión (URI) y colócala en `backend/.env`:

```env
DATABASE_URL="mongodb+srv://<usuario>:<password>@<tu-cluster>.mongodb.net/nexolab?retryWrites=true&w=majority"
```

### Opción 2: MongoDB Local

Si cuentas con MongoDB en tu equipo local:

```env
DATABASE_URL="mongodb://127.0.0.1:27017/nexolab?authSource=admin"
```

### Sincronización y Carga de Datos Demo

Desde la carpeta `backend`:

```bash
cd backend

# Generar el cliente de Prisma para MongoDB
npm run db:generate

# Sincronizar colecciones e índices en MongoDB
npm run db:push

# Cargar usuarios demo, laboratorios, equipos, reservas e incidentes
npm run db:seed
```

---

## Cómo ejecutar

NexoLab se ejecuta en dos procesos independientes (API Backend y Frontend):

```bash
# Terminal 1 — Backend (puerto 4000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (puerto 2000)
cd frontend
npm install
npm run dev
```

- **Aplicación web:** http://localhost:2000
- **API Backend:** http://localhost:4000/api
- **Verificación de salud:** http://localhost:4000/api/health

### Cuentas en MongoDB

El login valida usuarios **guardados en MongoDB Atlas** (no hay cuentas hardcodeadas en el frontend).  
Si en tu cluster ya existen, por ejemplo:

| Rol | Correo | Contraseña típica (si la creaste así) |
|-----|--------|----------------------------------------|
| Admin | `admin@nexolab.edu` | la que tengas en BD |
| Docente | `docente@nexolab.edu` | la que tengas en BD |
| Alumno | `alumno@nexolab.edu` | la que tengas en BD |

También puedes crear cuentas nuevas con **Registro**.

Integrantes del equipo: 

Fernando adolfo cancino cuenca 2132913
Daira Yamile aguilar castro 2056579
jorge damian felzardo hernandez 2132920
MIA LOURDES GARCIA ELIAS 2071837

