import { useEffect, useState } from 'react';
import { Box, CardContent, Grid, Stack, Typography } from '@mui/material';
import api from '../api/client';
import type { ReportsData, Reservation } from '../types';
import { useAuth } from '../context/AuthContext';
import { tokens } from '../theme/tokens';
import InfoCard from '../components/InfoCard';
import { ReservationStatusChip, RoleChip } from '../components/StatusChip';
import { formatReservationDateTime } from '../utils/reservationTime';

export default function DashboardPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [upcoming, setUpcoming] = useState<Reservation[]>([]);

  useEffect(() => {
    const load = async () => {
      const [rep, res] = await Promise.all([api.get('/reports'), api.get('/reservations')]);
      setReports(rep.data.data);
      const list = (res.data.data as Reservation[])
        .filter((r) => ['PENDING', 'CONFIRMED'].includes(r.status))
        .slice(0, 8);
      setUpcoming(list);
    };
    load().catch(() => undefined);
  }, []);

  const kpis = [
    { label: 'Laboratorios', value: reports?.kpis.laboratories ?? '—', accent: tokens.primary },
    { label: 'Equipos', value: reports?.kpis.equipment ?? '—', accent: tokens.secondary },
    {
      label: 'Reservas activas',
      value: reports?.kpis.activeReservations ?? '—',
      accent: tokens.primaryStrong,
    },
    { label: 'Fallos abiertos', value: reports?.kpis.openIncidents ?? '—', accent: tokens.warning },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="text.primary">
        Hola, {user?.fullName?.split(' ')[0]}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Vista rápida del estado operativo: 12 laboratorios e inventario de 24 equipos de préstamo.
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
            {upcoming.map((r) => {
              const who = r.reservedBy || r.user;
              return (
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
                      {r.laboratory?.code} · {formatReservationDateTime(r.startsAt)}
                      {r.groupCount && r.groupCount > 1 ? ` · ${r.groupCount} alumnos` : ''}
                    </Typography>
                    {who && (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <Typography variant="body2" sx={{ color: tokens.textOnLight, fontWeight: 600 }}>
                          {who.fullName}
                        </Typography>
                        <RoleChip role={who.role} />
                      </Stack>
                    )}
                  </Box>
                  <ReservationStatusChip
                    status={r.status}
                    sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                  />
                </Stack>
              );
            })}
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
