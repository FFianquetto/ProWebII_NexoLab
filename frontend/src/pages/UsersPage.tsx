import { MenuItem, TextField } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import { RoleChip } from '../components/StatusChip';
import type { User } from '../types';
import { roleLabels } from '../constants/labels';
import { useAuth } from '../context/AuthContext';

export default function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <ResourcePage<User & { password?: string }>
      title="Usuarios"
      endpoint="/users"
      canCreate={isAdmin}
      canEdit={() => false}
      canDelete={() => isAdmin}
      emptyForm={{
        email: '',
        fullName: '',
        role: 'STUDENT',
        studentId: '',
        phone: '',
        isActive: true,
        password: '',
      }}
      columns={[
        { key: 'fullName', label: 'Nombre', primary: true },
        { key: 'email', label: 'Correo' },
        {
          key: 'role',
          label: 'Rol',
          render: (row) => <RoleChip role={row.role} />,
        },
      ]}
      toPayload={(values, mode) => {
        const payload: Record<string, unknown> = {
          email: values.email,
          fullName: values.fullName,
          role: values.role,
          studentId: values.studentId || null,
          phone: values.phone || null,
        };
        if (mode === 'create') {
          payload.password = values.password;
        } else {
          payload.isActive = values.isActive !== false;
          if (values.password) payload.password = values.password;
        }
        return payload;
      }}
      renderForm={(values, setValues, mode) => (
        <>
          <TextField label="Nombre" value={values.fullName || ''} onChange={(e) => setValues({ ...values, fullName: e.target.value })} required fullWidth />
          <TextField label="Correo" type="email" value={values.email || ''} onChange={(e) => setValues({ ...values, email: e.target.value })} required fullWidth />
          <TextField label={mode === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'} type="password" value={values.password || ''} onChange={(e) => setValues({ ...values, password: e.target.value })} required={mode === 'create'} fullWidth />
          <TextField select label="Rol" value={values.role || 'STUDENT'} onChange={(e) => setValues({ ...values, role: e.target.value as User['role'] })} fullWidth>
            {Object.entries(roleLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Matrícula" value={values.studentId || ''} onChange={(e) => setValues({ ...values, studentId: e.target.value })} fullWidth />
          <TextField label="Teléfono" value={values.phone || ''} onChange={(e) => setValues({ ...values, phone: e.target.value })} fullWidth />
          {mode === 'edit' && (
            <TextField select label="Activo" value={values.isActive === false ? 'false' : 'true'} onChange={(e) => setValues({ ...values, isActive: e.target.value === 'true' })} fullWidth>
              <MenuItem value="true">Sí</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </TextField>
          )}
        </>
      )}
    />
  );
}
