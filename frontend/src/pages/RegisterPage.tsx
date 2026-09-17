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
import { getApiErrorMessage } from '../utils/apiError';

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      next.fullName = 'El nombre debe tener al menos 2 caracteres.';
    }
    if (!form.email.trim()) {
      next.email = 'Ingresa tu correo electrónico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'El correo no tiene un formato válido.';
    }
    if (!form.password) {
      next.password = 'Ingresa una contraseña.';
    } else if (form.password.length < 8) {
      next.password = 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (form.role === 'STUDENT') {
      const id = form.studentId.trim();
      if (!id) {
        next.studentId = 'La matrícula es obligatoria para alumnos.';
      } else if (!/^\d{7}$/.test(id)) {
        next.studentId = 'La matrícula debe tener exactamente 7 números.';
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        studentId: form.role === 'STUDENT' ? form.studentId.trim() : undefined,
      });
      navigate('/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo registrar. Revisa los datos e intenta de nuevo.'));
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
        <Stack component="form" spacing={2} onSubmit={onSubmit} noValidate>
          <TextField
            label="Nombre completo"
            value={form.fullName}
            onChange={(e) => {
              setForm({ ...form, fullName: e.target.value });
              setFieldErrors((prev) => ({ ...prev, fullName: '' }));
            }}
            error={Boolean(fieldErrors.fullName)}
            helperText={fieldErrors.fullName || ' '}
            required
            fullWidth
          />
          <TextField
            label="Correo"
            type="email"
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setFieldErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email || ' '}
            required
            fullWidth
          />
          <TextField
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              setFieldErrors((prev) => ({ ...prev, password: '' }));
            }}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password || 'Mínimo 8 caracteres'}
            required
            fullWidth
          />
          <TextField
            select
            label="Rol"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value, studentId: '' })}
            fullWidth
          >
            <MenuItem value="STUDENT">Alumno</MenuItem>
            <MenuItem value="TEACHER">Docente</MenuItem>
          </TextField>
          {form.role === 'STUDENT' && (
            <TextField
              label="Matrícula"
              value={form.studentId}
              onChange={(e) => {
                const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 7);
                setForm({ ...form, studentId: onlyDigits });
                setFieldErrors((prev) => ({ ...prev, studentId: '' }));
              }}
              error={Boolean(fieldErrors.studentId)}
              helperText={fieldErrors.studentId || 'Exactamente 7 números (ej. 1845123)'}
              required
              fullWidth
              inputProps={{ inputMode: 'numeric', maxLength: 7, pattern: '\\d{7}' }}
            />
          )}
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Creando…' : 'Registrarme'}
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
