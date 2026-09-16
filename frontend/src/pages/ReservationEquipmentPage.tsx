import { useEffect, useState } from 'react';
import { MenuItem, TextField } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import api from '../api/client';
import type { Equipment, Reservation, ReservationEquipment } from '../types';

export default function ReservationEquipmentPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    Promise.all([api.get('/reservations'), api.get('/equipment')])
      .then(([r, e]) => {
        setReservations(r.data.data);
        setEquipment(e.data.data);
      })
      .catch(() => undefined);
  }, []);

  return (
    <ResourcePage<ReservationEquipment>
      title="Asignaciones"
      subtitle="Equipo asignado a cada reserva."
      endpoint="/reservation-equipment"
      emptyForm={{
        reservationId: reservations[0]?.id || '',
        equipmentId: equipment[0]?.id || '',
        quantity: 1,
      }}
      columns={[
        {
          key: 'reservation',
          label: 'Reserva',
          primary: true,
          render: (row) => row.reservation?.title || row.reservationId,
        },
        {
          key: 'equipment',
          label: 'Equipo',
          render: (row) => row.equipment?.inventoryCode || row.equipmentId,
        },
        { key: 'quantity', label: 'Cantidad' },
      ]}
      toPayload={(values) => ({
        reservationId: String(values.reservationId),
        equipmentId: String(values.equipmentId),
        quantity: Number(values.quantity || 1),
      })}
      renderForm={(values, setValues) => (
        <>
          <TextField
            select
            label="Reserva"
            value={values.reservationId || ''}
            onChange={(e) => setValues({ ...values, reservationId: e.target.value })}
            required
            fullWidth
          >
            {reservations.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.title} ({new Date(r.startsAt).toLocaleDateString('es-MX')})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Equipo"
            value={values.equipmentId || ''}
            onChange={(e) => setValues({ ...values, equipmentId: e.target.value })}
            required
            fullWidth
          >
            {equipment.map((eq) => (
              <MenuItem key={eq.id} value={eq.id}>
                {eq.inventoryCode} — {eq.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Cantidad"
            type="number"
            value={values.quantity ?? 1}
            onChange={(e) => setValues({ ...values, quantity: Number(e.target.value) })}
            fullWidth
          />
        </>
      )}
    />
  );
}
