import { useEffect, useState } from 'react';
import { MenuItem, TextField } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import api from '../api/client';
import type { Equipment, Incident, Laboratory, User } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  incidentStatusLabels,
  labelOf,
  severityLabels,
} from '../constants/labels';

export default function IncidentsPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/laboratories'), api.get('/equipment')])
      .then(([u, l, e]) => {
        setUsers(u.data.data);
        setLabs(l.data.data);
        setEquipment(e.data.data);
      })
      .catch(() => undefined);
  }, []);

  return (
    <ResourcePage<Incident>
      title="Incidencias"
      subtitle="Reportes de fallas y mantenimiento en laboratorios o equipo."
      endpoint="/incidents"
      emptyForm={{
        title: '',
        description: '',
        status: 'OPEN',
        severity: 'MEDIUM',
        laboratoryId: null,
        equipmentId: null,
        reportedById: user?.id || '',
      }}
      columns={[
        { key: 'title', label: 'Título', primary: true },
        {
          key: 'severity',
          label: 'Severidad',
          render: (row) => labelOf(severityLabels, row.severity),
        },
        {
          key: 'status',
          label: 'Estado',
          render: (row) => labelOf(incidentStatusLabels, row.status),
        },
        {
          key: 'laboratory',
          label: 'Laboratorio',
          render: (row) => row.laboratory?.code || '—',
        },
        {
          key: 'reportedBy',
          label: 'Reportó',
          render: (row) => row.reportedBy?.fullName || row.reportedById,
        },
      ]}
      toPayload={(values) => ({
        title: values.title,
        description: values.description,
        status: values.status,
        severity: values.severity,
        laboratoryId: values.laboratoryId ? String(values.laboratoryId) : null,
        equipmentId: values.equipmentId ? String(values.equipmentId) : null,
        reportedById: String(values.reportedById || user?.id),
      })}
      renderForm={(values, setValues) => (
        <>
          <TextField
            label="Título"
            value={values.title || ''}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Descripción del problema"
            value={values.description || ''}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
            required
            fullWidth
            multiline
            minRows={3}
          />
          <TextField
            select
            label="Severidad"
            value={values.severity || 'MEDIUM'}
            onChange={(e) => setValues({ ...values, severity: e.target.value as Incident['severity'] })}
            fullWidth
          >
            {Object.entries(severityLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Estado"
            value={values.status || 'OPEN'}
            onChange={(e) => setValues({ ...values, status: e.target.value as Incident['status'] })}
            fullWidth
          >
            {Object.entries(incidentStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Laboratorio (opcional)"
            value={values.laboratoryId ?? ''}
            onChange={(e) => setValues({ ...values, laboratoryId: e.target.value ? e.target.value : null })}
            fullWidth
          >
            <MenuItem value="">Ninguno</MenuItem>
            {labs.map((lab) => (
              <MenuItem key={lab.id} value={lab.id}>
                {lab.code} - {lab.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Equipo afectado (opcional)"
            value={values.equipmentId ?? ''}
            onChange={(e) => setValues({ ...values, equipmentId: e.target.value ? e.target.value : null })}
            fullWidth
          >
            <MenuItem value="">Ninguno</MenuItem>
            {equipment.map((eq) => (
              <MenuItem key={eq.id} value={eq.id}>
                {eq.inventoryCode} - {eq.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Reportado por"
            value={values.reportedById || ''}
            onChange={(e) => setValues({ ...values, reportedById: e.target.value })}
            required
            fullWidth
          >
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.fullName} ({u.email})
              </MenuItem>
            ))}
          </TextField>
        </>
      )}
    />
  );
}
