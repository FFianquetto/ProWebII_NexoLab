import { useEffect, useMemo, useState } from 'react';
import { Alert, MenuItem, TextField, Typography } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import api from '../api/client';
import type { Reservation, ReservationEquipment } from '../types';
import { useAuth } from '../context/AuthContext';
import { isAdmin, isStudent, isTeacher } from '../constants/permissions';
import { formatReservationDateTime } from '../utils/reservationTime';

const LOAN_CATEGORIES = ['Computadora', 'Casco VR', 'Bocina', 'Multímetro'] as const;
type LoanCategory = (typeof LOAN_CATEGORIES)[number];

type CategoryAvailability = {
  category: string;
  total: number;
  inUse: number;
  available: number;
};

function cleanReservationTitle(title?: string) {
  if (!title) return 'Reserva';
  return title.replace(/\s*grupal\s*/gi, ' ').replace(/\s+/g, ' ').trim();
}

function LoanFormFields({
  values,
  setValues,
  activeReservations,
}: {
  values: Partial<ReservationEquipment> & { category?: string };
  setValues: (v: Partial<ReservationEquipment> & { category?: string }) => void;
  activeReservations: Reservation[];
}) {
  const [categoryAvail, setCategoryAvail] = useState<CategoryAvailability[]>([]);

  useEffect(() => {
    const resId = values.reservationId;
    if (!resId) {
      setCategoryAvail([]);
      return;
    }
    let cancelled = false;
    api
      .get('/reservation-equipment/availability', { params: { reservationId: resId } })
      .then(({ data }) => {
        if (!cancelled) setCategoryAvail((data.data || []) as CategoryAvailability[]);
      })
      .catch(() => {
        if (!cancelled) setCategoryAvail([]);
      });
    return () => {
      cancelled = true;
    };
  }, [values.reservationId]);

  const selectedRes = activeReservations.find((r) => r.id === values.reservationId);
  const selectedCatInfo = categoryAvail.find((c) => c.category === values.category);

  return (
    <>
      <TextField
        select
        label="Tu reserva"
        value={values.reservationId || ''}
        onChange={(e) =>
          setValues({ ...values, reservationId: e.target.value, category: '', equipmentId: '' })
        }
        required
        fullWidth
      >
        {activeReservations.length === 0 && (
          <MenuItem value="" disabled>
            No tienes reservas activas
          </MenuItem>
        )}
        {activeReservations.map((r) => (
          <MenuItem key={r.id} value={r.id}>
            {cleanReservationTitle(r.title)} · {r.laboratory?.code || 'Lab'} ·{' '}
            {formatReservationDateTime(r.startsAt)}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="¿Qué necesitas?"
        value={values.category || ''}
        onChange={(e) => setValues({ ...values, category: e.target.value })}
        required
        fullWidth
        disabled={!selectedRes}
        helperText={
          selectedRes
            ? `Préstamo individual hasta ${formatReservationDateTime(selectedRes.endsAt)}`
            : 'Primero elige una de tus reservas'
        }
      >
        {LOAN_CATEGORIES.map((cat) => {
          const info = categoryAvail.find((c) => c.category === cat);
          const left = info?.available;
          const label =
            left == null
              ? cat
              : left > 0
                ? `${cat} (${left} disponibles)`
                : `${cat} (no hay por el momento)`;
          return (
            <MenuItem key={cat} value={cat} disabled={left === 0}>
              {label}
            </MenuItem>
          );
        })}
      </TextField>

      {selectedCatInfo && (
        <Typography variant="body2" sx={{ color: '#122018', fontWeight: 600 }}>
          {selectedCatInfo.available > 0
            ? `Hay ${selectedCatInfo.available} de ${selectedCatInfo.total} ${selectedCatInfo.category} libres en ese horario. Se te asignará 1.`
            : `No hay ${selectedCatInfo.category} disponibles por el momento.`}
        </Typography>
      )}

      <Alert severity="success" sx={{ py: 0.5 }}>
        Préstamo <strong>1 a 1</strong> · inventario: 6 computadoras, 6 cascos VR, 6 bocinas, 6
        multímetros.
      </Alert>
    </>
  );
}

export default function ReservationEquipmentPage() {
  const { user } = useAuth();
  const student = isStudent(user?.role);
  const teacher = isTeacher(user?.role);
  const admin = isAdmin(user?.role);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [assignments, setAssignments] = useState<ReservationEquipment[]>([]);

  const reloadExtras = () =>
    Promise.all([api.get('/reservations'), api.get('/reservation-equipment')])
      .then(([r, a]) => {
        setReservations(r.data.data as Reservation[]);
        setAssignments(a.data.data as ReservationEquipment[]);
      })
      .catch(() => undefined);

  useEffect(() => {
    reloadExtras();
  }, []);

  const now = Date.now();

  const activeReservations = useMemo(
    () =>
      reservations.filter(
        (r) =>
          ['PENDING', 'CONFIRMED'].includes(r.status) && new Date(r.endsAt).getTime() > now,
      ),
    [reservations, now],
  );

  const hasActiveLoan = useMemo(() => {
    if (admin) return false;
    return assignments.some((a) => {
      const ends = a.reservation?.endsAt ? new Date(a.reservation.endsAt).getTime() : 0;
      return a.reservation?.userId === user?.id && ends > now;
    });
  }, [assignments, admin, user?.id, now]);

  const ownsRow = (row: ReservationEquipment) =>
    admin || row.reservation?.userId === user?.id;

  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Préstamo individual (1 a 1):</strong> elige qué necesitas —{' '}
        <strong>Computadora, Casco VR, Bocina o Multímetro</strong> (6 de cada uno). Si las 6 de esa
        categoría ya están prestadas en ese horario, no habrá disponible. Horario:{' '}
        <strong>8:00 a.m.–8:00 p.m.</strong>, ~<strong>2 h</strong>.
      </Alert>

      {hasActiveLoan && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Ya tienes un equipo en préstamo. Espera a que termine (~2 h) o libéralo para pedir otro.
        </Alert>
      )}

      <ResourcePage<ReservationEquipment & { category?: string }>
        title="Equipos prestados"
        endpoint="/reservation-equipment"
        canCreate={(student || teacher || admin) && (!hasActiveLoan || admin)}
        canEdit={() => false}
        canDelete={ownsRow}
        emptyForm={{
          reservationId: activeReservations[0]?.id || '',
          category: '',
          quantity: 1,
        }}
        onSaved={() => reloadExtras()}
        columns={[
          {
            key: 'reservation',
            label: 'Reserva',
            primary: true,
            render: (row) => cleanReservationTitle(row.reservation?.title) || row.reservationId,
          },
          {
            key: 'equipment',
            label: 'Equipo',
            render: (row) =>
              row.equipment
                ? `${row.equipment.category || ''} · ${row.equipment.name}`
                : row.equipmentId,
          },
          {
            key: 'endsAt',
            label: 'Hasta',
            render: (row) => formatReservationDateTime(row.reservation?.endsAt),
          },
        ]}
        validateBeforeSave={async (values) => {
          if (!values.reservationId) return 'Selecciona una reserva.';
          if (!values.category) return 'Indica qué equipo quieres (categoría).';
          if (hasActiveLoan && !admin) {
            return 'Ya tienes un equipo en préstamo. Termina ese tiempo (~2 h) antes de pedir otro.';
          }
          try {
            const { data } = await api.get('/reservation-equipment/availability', {
              params: { reservationId: values.reservationId },
            });
            const list = (data.data || []) as CategoryAvailability[];
            const info = list.find((c) => c.category === values.category);
            if (info && info.available <= 0) {
              return `No hay ${values.category} disponibles por el momento.`;
            }
          } catch {
            // el backend valida igual
          }
          return null;
        }}
        toPayload={(values) => ({
          reservationId: String(values.reservationId),
          category: String(values.category),
          quantity: 1,
        })}
        renderForm={(values, setValues) => (
          <LoanFormFields
            values={values}
            setValues={setValues}
            activeReservations={activeReservations}
          />
        )}
      />
    </>
  );
}
