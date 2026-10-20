import { MenuItem, TextField, Box } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import type { Subject } from '../types';

export default function SubjectsPage() {
  return (
    <ResourcePage<Subject>
      title="Materias"
      subtitle="Catálogo académico vinculado a prácticas."
      endpoint="/subjects"
      emptyForm={{ code: '', name: '', description: '', credits: 0, isActive: true }}
      columns={[
        { key: 'code', label: 'Clave', primary: true },
        { key: 'name', label: 'Nombre' },
        { key: 'credits', label: 'Créditos' },
        {
          key: 'isActive',
          label: 'Activa',
          render: (row) => (row.isActive ? 'Sí' : 'No'),
        },
      ]}
      toPayload={(values) => ({
        // Optimización: Limpieza de espacios en blanco accidentales
        code: values.code?.trim(),
        name: values.name?.trim(),
        description: values.description?.trim() || null,
        // Optimización: Math.max asegura que no se envíen créditos negativos al backend
        credits: Math.max(0, Number(values.credits || 0)),
        isActive: values.isActive !== false,
      })}
      renderForm={(values, setValues) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Clave"
            value={values.code || ''}
            onChange={(e) => setValues({ ...values, code: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Nombre"
            value={values.name || ''}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Créditos"
            type="number"
            value={values.credits ?? 0}
            onChange={(e) => setValues({ ...values, credits: Number(e.target.value) })}
            fullWidth
            inputProps={{ min: 0 }} // Previene que el usuario baje de 0 en la interfaz
          />
          <TextField
            select
            label="Activa"
            value={values.isActive === false ? 'false' : 'true'}
            onChange={(e) => setValues({ ...values, isActive: e.target.value === 'true' })}
            fullWidth
          >
            {/* Optimización: Colores semánticos para el estado de la materia */}
            <MenuItem value="true" sx={{ color: 'success.main', fontWeight: 500 }}>
              Sí
            </MenuItem>
            <MenuItem value="false" sx={{ color: 'error.main', fontWeight: 500 }}>
              No
            </MenuItem>
          </TextField>
          <TextField
            label="Descripción"
            value={values.description || ''}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
            fullWidth
            multiline
            minRows={3} // Aumentado ligeramente para mejor lectura
          />
        </Box>
      )}
    />
  );
}