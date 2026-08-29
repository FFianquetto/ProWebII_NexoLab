import { useEffect, useState } from 'react';
import { MenuItem, TextField } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import api from '../api/client';
import type { Laboratory, Reservation, Subject, User } from '../types';
import { labelOf, reservationStatusLabels } from '../constants/labels';

function toLocalInput(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReservationsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/laboratories'), api.get('/subjects')])
      .then(([u, l, s]) => {
        setUsers(u.data.data);
        setLabs(l.data.data);
        setSubjects(s.data.data);
      })
      .catch(() => undefined);
  }, []);

  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() + 1, 0, 0, 0);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setHours(defaultEnd.getHours() + 2);

  return (
    <ResourcePage<Reservation>
      title="Reservas"
      subtitle="Agenda de uso de laboratorios."
      endpoint="/reservations"
      emptyForm={{
        userId: users[0]?.id || 0,
        laboratoryId: labs[0]?.id || 0,
        subjectId: null,
        title: '',
        purpose: '',
        startsAt: defaultStart.toISOString(),
        endsAt: defaultEnd.toISOString(),
        attendees: 1,
        status: 'PENDING',
      }}
      columns={[
        { key: 'title', label: 'Título', primary: true },
        {
          key: 'laboratory',
          label: 'Laboratorio',
          render: (row) => row.laboratory?.code || row.laboratoryId,
        },
        {
          key: 'user',
          label: 'Solicitante',
          render: (row) => row.user?.fullName || row.userId,
        },
        {
          key: 'startsAt',
          label: 'Inicio',
          render: (row) => new Date(row.startsAt).toLocaleString('es-MX'),
        },
        {
          key: 'status',
          label: 'Estado',
          render: (row) => labelOf(reservationStatusLabels, row.status),
        },
      ]}
      toPayload={(values) => ({
        userId: Number(values.userId),
        laboratoryId: Number(values.laboratoryId),
        subjectId: values.subjectId ? Number(values.subjectId) : null,
        title: values.title,
        purpose: values.purpose || null,
        startsAt: values.startsAt,
        endsAt: values.endsAt,
        attendees: Number(values.attendees || 1),
        status: values.status || 'PENDING',
      })}
      renderForm={(values, setValues) => (
        <>
          <TextField label="Título" value={values.title || ''} onChange={(e) => setValues({ ...values, title: e.target.value })} required fullWidth />
          <TextField select label="Solicitante" value={values.userId || ''} onChange={(e) => setValues({ ...values, userId: Number(e.target.value) })} required fullWidth>
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.fullName}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Laboratorio" value={values.laboratoryId || ''} onChange={(e) => setValues({ ...values, laboratoryId: Number(e.target.value) })} required fullWidth>
            {labs.map((lab) => (
              <MenuItem key={lab.id} value={lab.id}>
                {lab.code}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Materia" value={values.subjectId ?? ''} onChange={(e) => setValues({ ...values, subjectId: e.target.value ? Number(e.target.value) : null })} fullWidth>
            <MenuItem value="">Sin materia</MenuItem>
            {subjects.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.code}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Inicio" type="datetime-local" value={toLocalInput(values.startsAt)} onChange={(e) => setValues({ ...values, startsAt: new Date(e.target.value).toISOString() })} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Fin" type="datetime-local" value={toLocalInput(values.endsAt)} onChange={(e) => setValues({ ...values, endsAt: new Date(e.target.value).toISOString() })} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Asistentes" type="number" value={values.attendees ?? 1} onChange={(e) => setValues({ ...values, attendees: Number(e.target.value) })} fullWidth />
          <TextField select label="Estado" value={values.status || 'PENDING'} onChange={(e) => setValues({ ...values, status: e.target.value as Reservation['status'] })} fullWidth>
            {Object.entries(reservationStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Propósito" value={values.purpose || ''} onChange={(e) => setValues({ ...values, purpose: e.target.value })} fullWidth multiline minRows={2} />
        </>
      )}
    />
  );
}
