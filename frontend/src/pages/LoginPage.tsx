import { FormEvent, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@nexolab.edu');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'No se pudo iniciar sesión';
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
    'radial-gradient(circle at 80% 20%, rgba(14, 116, 144, 0.35), transparent 45%), radial-gradient(circle at 15% 85%, rgba(16, 185, 129, 0.2), transparent 40%), linear-gradient(150deg, #041d16 0%, #062b22 50%, #071f28 100%)',
    }}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.35)',
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 800, color: 'primary.main' }}
          gutterBottom
        >
          NexoLab
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Accede para gestionar laboratorios, equipos y reservas.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack component="form" spacing={2} onSubmit={onSubmit}>
          <TextField
            label="Correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </Stack>
        <Typography variant="body2" mt={2.5}>
          ¿No tienes cuenta?{' '}
          <Link component={RouterLink} to="/register">
            Regístrate
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
