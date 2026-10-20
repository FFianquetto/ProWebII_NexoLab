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
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        // Optimización: Solo enviamos la matrícula si el rol es realmente Alumno
        studentId: form.role === 'STUDENT' && form.studentId ? form.studentId.trim() : undefined,
      });
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'No se pudo registrar. Verifica tus datos e intenta nuevamente.';
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
        py: 3,
        background:
          'radial-gradient(circle at 82% 12%, rgba(34,166,199,0.2), transparent 28%), linear-gradient(145deg, #083528, #0D4F3C 55%, #0E7490)',
      }}
    >
      <Paper elevation={6} sx={{ width: '100%', maxWidth: 480, p: { xs: 3, sm: 4 }, borderRadius: 4 }}>
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
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
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
            label="Correo electrónico"
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
              label="Matrícula"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              required // Optimización: Si es alumno, la matrícula debería ser obligatoria
              fullWidth
            />
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            disableElevation
            sx={{ mt: 1, py: 1.2, fontWeight: 600, borderRadius: 2 }}
          >
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </Button>
        </Stack>

        <Typography variant="body2" mt={4} align="center" color="text.secondary">
          ¿Ya tienes cuenta?{' '}
          <Link component={RouterLink} to="/login" fontWeight={600} underline="hover">
            Inicia sesión
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
