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
import { getApiErrorMessage } from '../utils/apiError';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#FFFFFF',
  },
  '& input:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset',
    WebkitTextFillColor: '#0F172A',
    caretColor: '#0F172A',
    transition: 'background-color 99999s ease-out 0s',
  },
};

export default function LoginPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const validate = () => {
    let ok = true;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Ingresa tu correo electrónico.');
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('El correo no tiene un formato válido.');
      ok = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Ingresa tu contraseña.');
      ok = false;
    } else if (password.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      ok = false;
    } else {
      setPasswordError('');
    }

    return ok;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo iniciar sesión. Revisa tus datos e intenta de nuevo.'));
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
          'radial-gradient(circle at 18% 18%, rgba(34,166,199,0.22), transparent 32%), linear-gradient(145deg, #083528 0%, #0D4F3C 42%, #0E7490 100%)',
      }}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: 460,
          p: { xs: 3.5, sm: 4.5 },
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.35)',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 800,
            color: 'primary.main',
            fontSize: { xs: '2rem', sm: '2.35rem' },
            mb: 3,
          }}
        >
          NexoLab
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.98rem', textAlign: 'left' }}>
            {error}
          </Alert>
        )}
        <Stack
          component="form"
          spacing={2.25}
          onSubmit={onSubmit}
          noValidate
          sx={{ textAlign: 'left' }}
        >
          <TextField
            label="Correo"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            error={Boolean(emailError)}
            helperText={emailError || ' '}
            required
            fullWidth
            autoComplete="email"
            sx={fieldSx}
            slotProps={{
              input: { sx: { fontSize: '1.05rem' } },
              inputLabel: { sx: { fontSize: '1.05rem' } },
              formHelperText: { sx: { fontSize: '0.9rem' } },
            }}
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            error={Boolean(passwordError)}
            helperText={passwordError || ' '}
            required
            fullWidth
            autoComplete="current-password"
            sx={fieldSx}
            slotProps={{
              input: { sx: { fontSize: '1.05rem' } },
              inputLabel: { sx: { fontSize: '1.05rem' } },
              formHelperText: { sx: { fontSize: '0.9rem' } },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ fontSize: '1.05rem', py: 1.25, fontWeight: 700 }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </Stack>

        <Typography sx={{ mt: 2.75, fontSize: '1rem' }}>
          ¿No tienes cuenta?{' '}
          <Link component={RouterLink} to="/register" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            Regístrate
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
