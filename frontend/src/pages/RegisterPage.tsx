import { FormEvent, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register, token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STUDENT',
    studentId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role,
        studentId: form.studentId || undefined,
      });
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'No se pudo registrar';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
        sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        background:
      'radial-gradient(circle at 85% 15%, rgba(14, 165, 233, 0.15), transparent 35%), linear-gradient(135deg, #04291F 0%, #083D2F 50%, #064E3B 100%)',
  }}
>
      <Paper sx={{ width: '100%', maxWidth: 480, p: { xs: 3, sm: 4 }, borderRadius: 4 }}>
        <Typography
          variant="h4"
          sx={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 800, color: 'primary.main' }}
          gutterBottom
        >
          Crear cuenta
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Registro público de NexoLab. El alta de administradores se gestiona internamente.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack component="form" spacing={2.5} onSubmit={onSubmit}>
          <TextField
            label="Nombre completo"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Correo"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            fullWidth
            helperText="Mínimo 8 caracteres"
          />
          <TextField
            select
            label="Rol"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            fullWidth
          >
            <MenuItem value="STUDENT">Alumno</MenuItem>
            <MenuItem value="TEACHER">Docente</MenuItem>
          </TextField>
          {form.role === 'STUDENT' && (
            <TextField
            select
            label="Rol"
            value={form.role}
            onChange={(e) => {
            const newRole = e.target.value;
            setForm({...form,role: newRole, studentId: newRole === 'TEACHER' ? '' : form.studentId,});
           }}
          fullWidth
           size="medium"
            >
  <MenuItem value="STUDENT">Alumno</MenuItem>
  <MenuItem value="TEACHER">Docente</MenuItem>
</TextField>
          )}
          <Button type="submit" variant="contained" size="large" disabled={loading} sx={{
              py: 1.5, fontWeight: 700, fontSize: '1rem', textTransform: 'none',borderRadius: 2, boxShadow: 3,mt: 1 }}
          >
          {loading ? 'Creando cuenta…' : 'Registrarme'}
        </Button>
        </Stack>
        <Typography variant="body2" mt={2.5}>
          ¿Ya tienes cuenta?{' '}
          <Link component={RouterLink} to="/login">
            Inicia sesión
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
