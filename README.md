# ProWebII_NexoLab

**NexoLab** — plataforma universitaria para gestionar laboratorios, equipo, reservas e incidencias.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + TypeScript + **Material UI** |
| Backend | Node.js + Express (API JSON) |
| ORM | **Prisma** |
| Base de datos | **MySQL** (`nexolab`) |
| Auth | **JWT** Bearer (excepto login y registro) |
| Logs | Winston → `backend/logs/` |

## Estructura del repositorio

```
├── backend/                 # API REST
│   ├── prisma/              # Schema ORM + seed
│   ├── src/
│   │   ├── controllers/     # Lógica por recurso
│   │   ├── middleware/      # Auth, validación, errores
│   │   ├── routes/          # Endpoints HTTP
│   │   ├── validators/      # Zod (CREATE/UPDATE)
│   │   ├── lib/             # Prisma client
│   │   └── utils/           # Logger y respuestas
│   └── logs/                # app.log / error.log
├── frontend/                # App Material UI
│   └── src/
│       ├── components/      # Layout + CRUD reutilizable
│       ├── pages/           # Pantallas / rutas
│       ├── context/         # Auth
│       ├── api/             # Cliente Axios → Backend
│       └── theme.ts         # Design system
├── database/
│   └── nexolab.sql          # Script MySQL (entrega final)
└── README.md
```

## Cumplimiento de rúbrica

| Requisito | Estado |
|-----------|--------|
| ≥ 6 tablas | 7 tablas |
| Interacción BD solo vía ORM | Prisma |
| FE no habla con BD; solo Backend JSON | Sí |
| Reportes ≥ 4 consultas multi-tabla / KPIs | `/reports` |
| CRUD GET/POST/PUT/DELETE por tabla | Sí |
| Pantallas CRUD por tabla | Sí |
| Validaciones backend independientes | Zod |
| Logs de procesos/excepciones | `backend/logs/` |
| Login obligatorio + registro público | Sí |
| Token en endpoints privados | JWT Bearer |
| UI Material Design system | MUI |
| Script SQL de tablas | `database/nexolab.sql` |

## Pantallas y rutas (Frontend)

| Pantalla | Ruta |
|----------|------|
| Login | `/login` |
| Registro | `/register` |
| Panel | `/` |
| Laboratorios | `/laboratories` |
| Equipos | `/equipment` |
| Reservas | `/reservations` |
| Asignaciones | `/reservation-equipment` |
| Materias | `/subjects` |
| Incidencias | `/incidents` |
| Usuarios | `/users` |
| Reportes | `/reports` |

## Endpoints (Backend)

Base: `http://localhost:4000/api`

**Públicos:** `POST /auth/login`, `POST /auth/register`, `GET /health`

**Protegidos (Bearer token):** CRUD de  
`/users`, `/subjects`, `/laboratories`, `/equipment`, `/reservations`, `/reservation-equipment`, `/incidents`  
y `GET /reports`, `GET /auth/me`

## MySQL

1. Abre phpMyAdmin / Workbench / consola.
2. Ejecuta el archivo `database/nexolab.sql` (crea BD `nexolab` + 7 tablas + FKs).
3. El `.env` del backend ya apunta a `nexolab` — no hace falta cambiar nada más:

```env
DATABASE_URL="mysql://root@localhost:3306/nexolab"
```

Si tu usuario/contraseña MySQL son distintos, solo ajusta esa URL; el resto del `.env` se deja igual.

Luego sincroniza Prisma y carga datos demo:

```bash
cd backend
npx prisma db push
npm run db:seed
```

## Cómo ejecutar

**No uses `php -S`.** NexoLab es Node + React.

```bash
# Terminal 1 — API
cd backend
npm install
npm run dev

# Terminal 2 — UI (puerto 2000)
cd frontend
npm install
npm run dev
```

Si tu terminal **ya está** en `...\ProW\frontend`, solo corre `npm run dev`
(no vuelvas a hacer `cd frontend` o buscará `frontend\frontend`).

- App: http://localhost:2000  
- API: http://localhost:4000/api  
- Kick-off: ver `KickOff-NexoLab.txt`

### Credenciales demo

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Admin | admin@nexolab.edu | Admin123! |
| Docente | docente@nexolab.edu | Teacher123! |
| Alumno | alumno@nexolab.edu | Student123! |

