import { useEffect, useState } from 'react';
import { MenuItem, TextField } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import api from '../api/client';
import type { Equipment, Laboratory } from '../types';
import { equipmentStatusLabels, labelOf } from '../constants/labels';
import { useAuth } from '../context/AuthContext';

export default function EquipmentPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [labs, setLabs] = useState<Laboratory[]>([]);

  useEffect(() => {
    api.get('/laboratories').then((r) => setLabs(r.data.data)).catch(() => undefined);
  }, []);

  return (
    <ResourcePage<Equipment>
      title="Equipos"
      subtitle="Inventario asociado a cada laboratorio."
      endpoint="/equipment"
      canCreate={isAdmin}
      canEdit={() => isAdmin}
      canDelete={() => isAdmin}
      emptyForm={{
        inventoryCode: '',
        name: '',
        category: '',
        status: 'AVAILABLE',
        laboratoryId: labs[0]?.id || '',
        notes: '',
      }}
      columns={[
        { key: 'inventoryCode', label: 'Código', primary: true },
        { key: 'name', label: 'Nombre' },
        { key: 'category', label: 'Categoría' },
        {
          key: 'laboratory',
          label: 'Laboratorio',
          render: (row) => row.laboratory?.code || row.laboratoryId,
        },
        {
          key: 'status',
          label: 'Estado',
          render: (row) => labelOf(equipmentStatusLabels, row.status),
        },
      ]}
      toPayload={(values) => ({
        inventoryCode: values.inventoryCode,
        name: values.name,
        category: values.category,
        status: values.status,
        laboratoryId: String(values.laboratoryId),
        notes: values.notes || null,
      })}
      renderForm={(values, setValues) => (
        <>
          <TextField
            label="Código de inventario"
            value={values.inventoryCode || ''}
            onChange={(e) => setValues({ ...values, inventoryCode: e.target.value })}
            required
            fullWidth
            disabled={!isAdmin}
          />
          <TextField
            label="Nombre"
            value={values.name || ''}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            required
            fullWidth
            disabled={!isAdmin}
          />
          <TextField
            label="Categoría"
            value={values.category || ''}
            onChange={(e) => setValues({ ...values, category: e.target.value })}
            required
            fullWidth
            disabled={!isAdmin}
          />
          <TextField
            select
            label="Laboratorio"
            value={values.laboratoryId || ''}
            onChange={(e) => setValues({ ...values, laboratoryId: e.target.value })}
            required
            fullWidth
            disabled={!isAdmin}
          >
            {labs.map((lab) => (
              <MenuItem key={lab.id} value={lab.id}>
                {lab.code} — {lab.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Estado"
            value={values.status || 'AVAILABLE'}
            onChange={(e) => setValues({ ...values, status: e.target.value as Equipment['status'] })}
            fullWidth
            disabled={!isAdmin}
          >
            {Object.entries(equipmentStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Notas"
            value={values.notes || ''}
            onChange={(e) => setValues({ ...values, notes: e.target.value })}
            fullWidth
            multiline
            minRows={2}
            disabled={!isAdmin}
          />
        </>
      )}
    />
  );
}
