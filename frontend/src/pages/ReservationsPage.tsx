import { useEffect, useState } from 'react';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import ResourcePage from '../components/ResourcePage';
import ReservationDateTimeField, {
  type BusySlot,
} from '../components/ReservationDateTimeField';
import { ReservationStatusChip, RoleChip } from '../components/StatusChip';
import api from '../api/client';
import type { Laboratory, Reservation } from '../types';
import { reservationStatusLabels } from '../constants/labels';
import { useAuth } from '../context/AuthContext';
import { isAdmin, isStudent, isTeacher } from '../constants/permissions';
import { tokens } from '../theme/tokens';
import {
  formatReservationDateTime,
  isStartHourBlocked,
  nextBusinessStart,
  suggestEndFromStart,
  toHourStart,
  validateReservationWindow,
} from '../utils/reservationTime';

const STUDENT_GROUP_MIN = 5;
const MAX_ATTENDEES = 30;

function ReservationFormFields({
  values,
  setValues,
  labs,
  teacher,
  student,
  admin,
}: {
  values: Partial<Reservation>;
  setValues: (v: Partial<Reservation>) => void;
  labs: Laboratory[];
  teacher: boolean;
  student: boolean;
  admin: boolean;
}) {
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const windowHint = validateReservationWindow(values.startsAt, values.endsAt);
  const busyHint =
    values.startsAt && busySlots.length && isStartHourBlocked(values.startsAt, busySlots)
      ? 'Esa hora se traslapa con una reserva confirmada del laboratorio.'
      : null;

  useEffect(() => {
    const labId = values.laboratoryId;
    const startsAt = values.startsAt;
    if (!labId || !startsAt) {
      setBusySlots([]);
      return;
    }
    const day = dayjs(startsAt);
    if (!day.isValid()) {
      setBusySlots([]);
      return;
    }
    const dayKey = day.format('YYYY-MM-DD');
    const excludeId = values.id ? String(values.id) : '';
    let cancelled = false;

    api
      .get('/reservations/busy', {
        params: {
          laboratoryId: labId,
          day: dayKey,
          ...(excludeId ? { excludeId } : {}),
        },
      })
      .then((res) => {
        if (!cancelled) setBusySlots(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) setBusySlots([]);
      });

    return () => {
      cancelled = true;
    };
  }, [values.laboratoryId, values.startsAt, values.id]);

  return (
    <>
      <TextField
        label="Título de la reserva"
        value={values.title || ''}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
        required
        helperText="Obligatorio · mínimo 2 caracteres"
        fullWidth
      />

      <TextField
        select
        label="Laboratorio"
        value={values.laboratoryId || ''}
        onChange={(e) => setValues({ ...values, laboratoryId: e.target.value })}
        required
        fullWidth
      >
        {[...labs]
          .sort((a, b) => {
            const aOk = a.status === 'AVAILABLE' ? 0 : 1;
            const bOk = b.status === 'AVAILABLE' ? 0 : 1;
            return aOk - bOk || a.code.localeCompare(b.code);
          })
          .map((lab) => {
            const available = lab.status === 'AVAILABLE';
            return (
              <MenuItem key={lab.id} value={lab.id} disabled={!available}>
                {lab.code} - {lab.name} (Cap. {lab.capacity})
                {available ? '' : ' — Inactivo'}
              </MenuItem>
            );
          })}
      </TextField>

      <Alert severity={windowHint || busyHint ? 'warning' : 'info'} sx={{ py: 0.5 }}>
        {windowHint ||
          busyHint ||
          'Duración fija: 1 h 59 min. Horario 8:00 a.m.–8:00 p.m. (fin máx. 10:00 p.m.). Horas ocupadas deshabilitadas.'}
      </Alert>

      <Stack spacing={1.25}>
        <ReservationDateTimeField
          valueIso={values.startsAt}
          minDateTime={dayjs()}
          busySlots={busySlots}
          error={Boolean(windowHint || busyHint)}
          helperText={windowHint || busyHint || undefined}
          onChange={(startsAt) =>
            setValues({
              ...values,
              startsAt,
              endsAt: suggestEndFromStart(startsAt),
            })
          }
        />

        <TextField
          label="Fin (automático)"
          value={formatReservationDateTime(values.endsAt)}
          fullWidth
          disabled
          helperText="Inicio + 1 h 59 min · solo horas en punto"
        />
      </Stack>

      {teacher && (
        <TextField
          label="Número de asistentes"
          type="number"
          value={values.attendees ?? 1}
          slotProps={{
            htmlInput: {
              min: 1,
              max: Math.min(
                MAX_ATTENDEES,
                labs.find((l) => l.id === values.laboratoryId)?.capacity || MAX_ATTENDEES,
              ),
            },
          }}
          onChange={(e) => setValues({ ...values, attendees: Number(e.target.value) })}
          fullWidth
          required
          helperText="No puede superar la capacidad del laboratorio (máx. 30 personas)"
        />
      )}

      {student && (
        <Typography variant="body2" sx={{ color: tokens.textOnLight, fontWeight: 600 }}>
          Tu solicitud cuenta como 1 alumno.
        </Typography>
      )}

      {(teacher || admin) && (
        <TextField
          select
          label="Estado de la reserva"
          value={values.status || 'PENDING'}
          onChange={(e) =>
            setValues({ ...values, status: e.target.value as Reservation['status'] })
          }
          fullWidth
        >
          {Object.entries(reservationStatusLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      )}

      <TextField
        label="Propósito o justificación académica"
        value={values.purpose || ''}
        onChange={(e) => setValues({ ...values, purpose: e.target.value })}
        fullWidth
        multiline
        minRows={2}
      />
    </>
  );
}

export default function ReservationsPage() {
  const { user: currentUser } = useAuth();
  const student = isStudent(currentUser?.role);
  const teacher = isTeacher(currentUser?.role);
  const admin = isAdmin(currentUser?.role);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [info, setInfo] = useState('');

  useEffect(() => {
    api
      .get('/laboratories')
      .then((l) => setLabs(l.data.data))
      .catch(() => undefined);
  }, []);

  const defaultStart = dayjs(nextBusinessStart());
  const defaultStartIso = defaultStart.toDate().toISOString();
  const defaultEndIso = suggestEndFromStart(defaultStartIso);

  const ownsOrAdmin = (row: Reservation) =>
    admin || row.userId === currentUser?.id;

  return (
    <Box>
      {student && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Como alumno, cada cuenta cuenta como <strong>1 solicitud</strong>. Se necesitan mínimo{' '}
          <strong>{STUDENT_GROUP_MIN} alumnos</strong> pidiendo el mismo laboratorio y horario para
          que quede <strong>reservado</strong>. No puedes pedir dos veces el mismo slot ni otro lab
          que se traslape con tus ~<strong>2 h</strong> activas; después de ese fin sí puedes pedir
          otro. Horario: <strong>8:00 a.m.–8:00 p.m.</strong> (fin máx. 10:00 p.m.).
        </Alert>
      )}
      {teacher && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Como maestro apartas el laboratorio de forma directa. Máximo{' '}
          <strong>{MAX_ATTENDEES} personas</strong> (o la capacidad del lab). Horario:{' '}
          <strong>8:00 a.m.–8:00 p.m.</strong>; duración ~<strong>2 h</strong> (fin máx. 10:00 p.m.).
        </Alert>
      )}
      {admin && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Como administrador ves todas las reservas para dar seguimiento. No creas reservas propias.
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo('')}>
          {info}
        </Alert>
      )}

      <ResourcePage<Reservation>
        title="Reservas"
        endpoint="/reservations"
        emptyForm={{
          userId: currentUser?.id || '',
          laboratoryId: labs.find((l) => l.status === 'AVAILABLE')?.id || labs[0]?.id || '',
          subjectId: null,
          title: '',
          purpose: '',
          startsAt: defaultStartIso,
          endsAt: defaultEndIso,
          attendees: 1,
          status: 'PENDING',
        }}
        canCreate={student || teacher}
        canEdit={ownsOrAdmin}
        canDelete={ownsOrAdmin}
        getDeleteLabel={(row) =>
          `${row.title}${row.laboratory?.code ? ` (${row.laboratory.code})` : ''}`
        }
        validateBeforeSave={async (values) => {
          if (!values.title || String(values.title).trim().length < 2) {
            return 'El título debe tener al menos 2 caracteres.';
          }
          const basic = validateReservationWindow(values.startsAt, values.endsAt);
          if (basic) return basic;
          if (!values.laboratoryId || !values.startsAt) return 'Completa laboratorio y horario.';

          if (teacher || admin) {
            const labCap = labs.find((l) => l.id === values.laboratoryId)?.capacity || MAX_ATTENDEES;
            const maxPeople = Math.min(MAX_ATTENDEES, labCap);
            const attendees = Number(values.attendees || 1);
            if (attendees < 1) return 'Debes indicar al menos 1 asistente.';
            if (attendees > maxPeople) {
              return `No se puede reservar para más de ${maxPeople} personas (tope general 30 / capacidad del lab).`;
            }
          }

          const day = dayjs(values.startsAt).format('YYYY-MM-DD');
          try {
            const { data } = await api.get('/reservations/busy', {
              params: {
                laboratoryId: values.laboratoryId,
                day,
                ...(values.id ? { excludeId: values.id } : {}),
              },
            });
            const busy = (data.data || []) as BusySlot[];
            if (isStartHourBlocked(String(values.startsAt), busy)) {
              return 'Esa hora ya está ocupada en el laboratorio (se traslapa con otra reserva).';
            }
          } catch {
            // El backend igual valida conflicto al guardar
          }
          return null;
        }}
        onSaved={(data) => {
          const progress = (data as { groupProgress?: { message?: string } })?.groupProgress;
          if (progress?.message) setInfo(progress.message);
        }}
        columns={[
          {
            key: 'title',
            label: 'Título',
            primary: true,
            render: (row) =>
              String(row.title || '')
                .replace(/\s*grupal\s*/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim(),
          },
          {
            key: 'laboratory',
            label: 'Laboratorio',
            render: (row) => row.laboratory?.code || row.laboratoryId,
          },
          ...(admin
            ? [
                {
                  key: 'user',
                  label: 'Quién reservó',
                  render: (row: Reservation) => {
                    const who = row.reservedBy || row.user;
                    return (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{who?.fullName || row.userId}</span>
                        <RoleChip role={who?.role} />
                      </Stack>
                    );
                  },
                },
              ]
            : []),
          {
            key: 'attendees',
            label: teacher || admin ? 'Asistentes' : 'Solicitantes',
            render: (row) => {
              if (row.user?.role === 'STUDENT' || student) {
                const n = Number(row.groupCount ?? row.attendees ?? 1);
                return `${n} ${n === 1 ? 'alumno' : 'alumnos'}`;
              }
              return `${row.attendees} personas`;
            },
          },
          {
            key: 'startsAt',
            label: 'Inicio',
            render: (row) => formatReservationDateTime(row.startsAt),
          },
          {
            key: 'endsAt',
            label: 'Fin',
            render: (row) => formatReservationDateTime(row.endsAt),
          },
          {
            key: 'status',
            label: 'Estado',
            render: (row) => <ReservationStatusChip status={row.status} />,
          },
        ]}
        toPayload={(values) => {
          const startIso = toHourStart(new Date(values.startsAt as string)).toISOString();
          const endIso = suggestEndFromStart(startIso);
          const payload: Record<string, unknown> = {
            laboratoryId: String(values.laboratoryId),
            subjectId: null,
            title: String(values.title || '').trim(),
            purpose: values.purpose || null,
            startsAt: startIso,
            endsAt: endIso,
          };
          if (teacher || admin) {
            payload.attendees = Number(values.attendees || 1);
            // Maestro confirma al guardar (ocupa el lab de inmediato)
            payload.status = teacher ? 'CONFIRMED' : values.status || 'PENDING';
          }
          return payload;
        }}
        renderForm={(values, setValues) => (
          <ReservationFormFields
            values={values}
            setValues={setValues}
            labs={labs}
            teacher={teacher}
            student={student}
            admin={admin}
          />
        )}
      />
    </Box>
  );
}
