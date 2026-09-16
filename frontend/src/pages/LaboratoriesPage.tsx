import { Alert, MenuItem, TextField } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import type { Laboratory } from '../types';
import { labelOf, labStatusLabels } from '../constants/labels';
import { useAuth } from '../context/AuthContext';

export default function LaboratoriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Modo consulta: El catálogo de laboratorios es administrado exclusivamente por el personal Administrador (altas, bajas y mantenimiento).
        </Alert>
      )}

      <ResourcePage<Laboratory>
        title="Laboratorios"
        subtitle="Catálogo de espacios y su estado operativo. Altas y bajas gestionadas por el Administrador."
        endpoint="/laboratories"
        canCreate={isAdmin}
        canEdit={() => isAdmin}
        canDelete={() => isAdmin}
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
            <TextField
              label="Código"
              value={values.code || ''}
              onChange={(e) => setValues({ ...values, code: e.target.value })}
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
              label="Edificio"
              value={values.building || ''}
              onChange={(e) => setValues({ ...values, building: e.target.value })}
              required
              fullWidth
              disabled={!isAdmin}
            />
            <TextField
              label="Piso"
              value={values.floor || ''}
              onChange={(e) => setValues({ ...values, floor: e.target.value })}
              fullWidth
              disabled={!isAdmin}
            />
            <TextField
              label="Capacidad"
              type="number"
              value={values.capacity ?? 20}
              onChange={(e) => setValues({ ...values, capacity: Number(e.target.value) })}
              required
              fullWidth
              disabled={!isAdmin}
            />
            <TextField
              select
              label="Estado"
              value={values.status || 'AVAILABLE'}
              onChange={(e) => setValues({ ...values, status: e.target.value as Laboratory['status'] })}
              fullWidth
              disabled={!isAdmin}
            >
              {Object.entries(labStatusLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Descripción"
              value={values.description || ''}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
              fullWidth
              multiline
              minRows={2}
              disabled={!isAdmin}
            />
          </>
        )}
      />
    </>
  );
}
