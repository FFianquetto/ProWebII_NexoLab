import { MenuItem, TextField } from '@mui/material';
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
        code: values.code,
        name: values.name,
        description: values.description || null,
        credits: Number(values.credits || 0),
        isActive: values.isActive !== false,
      })}
      renderForm={(values, setValues) => (
        <>
          <TextField label="Clave" value={values.code || ''} onChange={(e) => setValues({ ...values, code: e.target.value })} required fullWidth />
          <TextField label="Nombre" value={values.name || ''} onChange={(e) => setValues({ ...values, name: e.target.value })} required fullWidth />
          <TextField label="Créditos" type="number" value={values.credits ?? 0} onChange={(e) => setValues({ ...values, credits: Number(e.target.value) })} fullWidth />
          <TextField select label="Activa" value={values.isActive === false ? 'false' : 'true'} onChange={(e) => setValues({ ...values, isActive: e.target.value === 'true' })} fullWidth>
            <MenuItem value="true">Sí</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>
          <TextField label="Descripción" value={values.description || ''} onChange={(e) => setValues({ ...values, description: e.target.value })} fullWidth multiline minRows={2} />
        </>
      )}
    />
  );
}
