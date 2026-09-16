import { useEffect, useState } from 'react';
import { Alert, Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import api from '../api/client';
import type { Laboratory, Reservation, Subject, User } from '../types';
import { labelOf, reservationStatusLabels, roleLabels } from '../constants/labels';
import { useAuth } from '../context/AuthContext';

function toLocalInput(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReservationsPage() {
  const { user: currentUser } = useAuth();
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

  // Solicitantes válidos (Maestros y Alumnos; el administrador lleva el control y no se auto-reserva)
  const selectableRequesters = users.filter((u) => u.role === 'TEACHER' || u.role === 'STUDENT');

  return (
    <ResourcePage<Reservation>
      title="Reservas"
      subtitle="Agenda y control de uso de laboratorios. Alumnos requieren mínimo 10 solicitantes; maestros pueden apartar individualmente."
      endpoint="/reservations"
      emptyForm={{
        userId: currentUser?.role === 'ADMIN' ? (selectableRequesters[0]?.id || '') : (currentUser?.id || ''),
        laboratoryId: labs[0]?.id || '',
        subjectId: null,
        title: '',
        purpose: '',
        startsAt: defaultStart.toISOString(),
        endsAt: defaultEnd.toISOString(),
        attendees: currentUser?.role === 'STUDENT' ? 10 : 1,
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
          render: (row) => (
            <Stack direction="row" spacing={1} alignItems="center">
              <span>{row.user?.fullName || row.userId}</span>
              {row.user?.role && (
                <Chip
                  size="small"
                  label={labelOf(roleLabels, row.user.role)}
                  variant="outlined"
                  color={row.user.role === 'TEACHER' ? 'primary' : 'default'}
                />
              )}
            </Stack>
          ),
        },
        {
          key: 'attendees',
          label: 'Solicitantes / Asistentes',
          render: (row) => `${row.attendees} personas`,
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
      toPayload={(values) => {
        const selectedUser = users.find((u) => u.id === values.userId);
        const isStudent = selectedUser?.role === 'STUDENT';
        const rawAttendees = Number(values.attendees || 1);
        const attendees = isStudent && rawAttendees < 10 ? 10 : rawAttendees;

        return {
          userId: String(values.userId),
          laboratoryId: String(values.laboratoryId),
          subjectId: values.subjectId ? String(values.subjectId) : null,
          title: values.title,
          purpose: values.purpose || null,
          startsAt: values.startsAt,
          endsAt: values.endsAt,
          attendees,
          status: values.status || 'PENDING',
        };
      }}
      renderForm={(values, setValues) => {
        const selectedUser = users.find((u) => u.id === values.userId);
        const isStudent = selectedUser?.role === 'STUDENT';
        const isTeacher = selectedUser?.role === 'TEACHER';
        const attendees = Number(values.attendees || 0);

        return (
          <>
            <TextField
              label="Título de la reserva"
              value={values.title || ''}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              required
              fullWidth
            />

            <TextField
              select
              label="Solicitante (Maestro o Alumno)"
              value={values.userId || ''}
              onChange={(e) => {
                const nextUserId = e.target.value;
                const nextUser = users.find((u) => u.id === nextUserId);
                const nextIsStudent = nextUser?.role === 'STUDENT';
                setValues({
                  ...values,
                  userId: nextUserId,
                  attendees: nextIsStudent && (values.attendees ?? 0) < 10 ? 10 : (values.attendees || 1),
                });
              }}
              required
              fullWidth
              helperText={
                isStudent
                  ? 'Usuario con rol Alumno: Se requiere un mínimo de 10 solicitantes para apartar.'
                  : isTeacher
                  ? 'Usuario con rol Maestro: Puede solicitar el laboratorio de forma individual (1 persona en adelante).'
                  : 'Selecciona al solicitante del laboratorio.'
              }
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id} disabled={u.role === 'ADMIN'}>
                  {u.fullName} — {labelOf(roleLabels, u.role)} {u.role === 'ADMIN' ? '(Administrador: sólo control)' : ''}
                </MenuItem>
              ))}
            </TextField>

            {isStudent && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                <strong>Regla de reserva para alumnos:</strong> Los salones/laboratorios sólo se pueden apartar cuando existan al menos <strong>10 solicitantes</strong>.
              </Alert>
            )}

            <TextField
              select
              label="Laboratorio"
              value={values.laboratoryId || ''}
              onChange={(e) => setValues({ ...values, laboratoryId: e.target.value })}
              required
              fullWidth
            >
              {labs.map((lab) => (
                <MenuItem key={lab.id} value={lab.id} disabled={lab.status !== 'AVAILABLE'}>
                  {lab.code} - {lab.name} (Capacidad: {lab.capacity}) {lab.status !== 'AVAILABLE' ? `[${lab.status}]` : ''}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Materia asociada (opcional)"
              value={values.subjectId ?? ''}
              onChange={(e) => setValues({ ...values, subjectId: e.target.value ? e.target.value : null })}
              fullWidth
            >
              <MenuItem value="">Sin materia</MenuItem>
              {subjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Fecha y hora de inicio"
              type="datetime-local"
              value={toLocalInput(values.startsAt)}
              onChange={(e) => setValues({ ...values, startsAt: new Date(e.target.value).toISOString() })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              label="Fecha y hora de fin"
              type="datetime-local"
              value={toLocalInput(values.endsAt)}
              onChange={(e) => setValues({ ...values, endsAt: new Date(e.target.value).toISOString() })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              label="Número de solicitantes / asistentes"
              type="number"
              value={values.attendees ?? (isStudent ? 10 : 1)}
              slotProps={{ htmlInput: { min: isStudent ? 10 : 1, max: 500 } }}
              onChange={(e) => setValues({ ...values, attendees: Number(e.target.value) })}
              fullWidth
              required
              error={Boolean(isStudent && attendees < 10)}
              helperText={
                isStudent
                  ? attendees < 10
                    ? 'Error: Mínimo 10 solicitantes para alumnos'
                    : 'Cumple el mínimo de 10 solicitantes para alumnos'
                  : 'Para maestros puede ser 1 solo solicitante'
              }
            />

            <TextField
              select
              label="Estado de la reserva"
              value={values.status || 'PENDING'}
              onChange={(e) => setValues({ ...values, status: e.target.value as Reservation['status'] })}
              fullWidth
            >
              {Object.entries(reservationStatusLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

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
      }}
    />
  );
}
