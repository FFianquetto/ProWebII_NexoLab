import { MenuItem, TextField } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import type { Laboratory } from '../types';
import { labelOf, labStatusLabels } from '../constants/labels';

export default function LaboratoriesPage() {
  return (
    <ResourcePage<Laboratory>
      title="Laboratorios"
      subtitle="Catálogo de espacios y su estado operativo."
      endpoint="/laboratories"
      emptyForm={{
        code: '',
        name: '',
        building: '',
        floor: '',
        capacity: 20,
        status: 'AVAILABLE',
        description: '',
      }}
      columns={[
        { key: 'code', label: 'Código', primary: true },
        { key: 'name', label: 'Nombre' },
        { key: 'building', label: 'Edificio' },
        { key: 'capacity', label: 'Capacidad' },
        {
          key: 'status',
          label: 'Estado',
          render: (row) => labelOf(labStatusLabels, row.status),
        },
      ]}
      renderForm={(values, setValues) => (
        <>
          <TextField label="Código" value={values.code || ''} onChange={(e) => setValues({ ...values, code: e.target.value })} required fullWidth />
          <TextField label="Nombre" value={values.name || ''} onChange={(e) => setValues({ ...values, name: e.target.value })} required fullWidth />
          <TextField label="Edificio" value={values.building || ''} onChange={(e) => setValues({ ...values, building: e.target.value })} required fullWidth />
          <TextField label="Piso" value={values.floor || ''} onChange={(e) => setValues({ ...values, floor: e.target.value })} fullWidth />
          <TextField label="Capacidad" type="number" value={values.capacity ?? 20} onChange={(e) => setValues({ ...values, capacity: Number(e.target.value) })} required fullWidth />
          <TextField select label="Estado" value={values.status || 'AVAILABLE'} onChange={(e) => setValues({ ...values, status: e.target.value as Laboratory['status'] })} fullWidth>
            {Object.entries(labStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Descripción" value={values.description || ''} onChange={(e) => setValues({ ...values, description: e.target.value })} fullWidth multiline minRows={2} />
        </>
      )}
    />
  );
}
