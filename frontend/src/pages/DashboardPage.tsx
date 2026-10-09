import { useEffect, useState } from 'react';
import { Box, CardContent, Grid, Stack, Typography, Chip } from '@mui/material';
import api from '../api/client';
import type { ReportsData, Reservation } from '../types';
import { useAuth } from '../context/AuthContext';
import { tokens } from '../theme/tokens';
import { labelOf, reservationStatusLabels } from '../constants/labels';
import InfoCard from '../components/InfoCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [upcoming, setUpcoming] = useState<Reservation[]>([]);

  useEffect(() => {
    const load = async () => {
      const [rep, res] = await Promise.all([
        api.get('/reports'),
        api.get('/reservations'),
      ]);
      setReports(rep.data.data);
      const list = (res.data.data as Reservation[])
        .filter((r) => ['PENDING', 'CONFIRMED'].includes(r.status))
        .slice(0, 5);
      setUpcoming(list);
    };
    load().catch(() => undefined);
  }, []);

  const kpis = [
    { label: 'Laboratorios', value: reports?.kpis.laboratories ?? '—', accent: tokens.primary },
    { label: 'Equipos', value: reports?.kpis.equipment ?? '—', accent: tokens.secondary },
    { label: 'Reservas activas', value: reports?.kpis.activeReservations ?? '—', accent: tokens.primaryStrong },
    { label: 'Incidencias abiertas', value: reports?.kpis.openIncidents ?? '—', accent: tokens.warning },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="text.primary">
        Hola, {user?.fullName?.split(' ')[0]}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Vista rápida del estado operativo de los laboratorios.
      </Typography>

      <Grid container spacing={2} mb={3}>
        {kpis.map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <InfoCard
              sx={{
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  bgcolor: kpi.accent,
                },
              }}
            >
              <CardContent sx={{ pl: 2.5 }}>
                <Typography variant="body2" sx={{ color: tokens.textOnLightMuted, fontWeight: 600 }}>
                  {kpi.label}
                </Typography>
                <Typography variant="h3" sx={{ color: tokens.textOnLight, mt: 0.5, fontWeight: 800 }}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </InfoCard>
          </Grid>
        ))}
      </Grid>

      <InfoCard>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: tokens.textOnLight }}>
            Próximas reservas
          </Typography>
          <Stack spacing={1.5}>
            {upcoming.map((r) => (
              <Stack
                key={r.id}
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                sx={{
                  p: 1.5,
                  borderRadius: `${tokens.radiusInfo}px`,
                  bgcolor: tokens.surfaceMuted,
                  border: `1px solid ${tokens.borderLight}`,
                }}
              >
                <Box>
                  <Typography fontWeight={700} sx={{ color: tokens.textOnLight }}>
                    {r.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: tokens.textOnLightMuted }}>
                    {r.laboratory?.code} · {new Date(r.startsAt).toLocaleString('es-MX')}
                  </Typography>
                </Box>
                <Chip
                  label={labelOf(reservationStatusLabels, r.status)}
                  size="small"
                  sx={{
                    alignSelf: { xs: 'flex-start', sm: 'center' },
                    bgcolor: 'rgba(31,168,122,0.12)',
                    color: tokens.primaryDeep,
                    border: '1px solid rgba(31,168,122,0.25)',
                  }}
                />
              </Stack>
            ))}
            {upcoming.length === 0 && (
              <Typography variant="body2" sx={{ color: tokens.textOnLightMuted }}>
                No hay reservas próximas.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </InfoCard>
    </Box>
  );
}
