import { useEffect, useState } from 'react';
import {
  Box,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Stack,
} from '@mui/material';
import api from '../api/client';
import type { ReportsData } from '../types';
import { tokens } from '../theme/tokens';
import InfoCard from '../components/InfoCard';
import {
  incidentStatusLabels,
  labelOf,
  reportColumnLabels,
  severityLabels,
} from '../constants/labels';

const kpiLabels: Record<string, string> = {
  laboratories: 'Laboratorios',
  equipment: 'Equipos',
  activeReservations: 'Reservas activas',
  openIncidents: 'Incidencias abiertas',
  activeUsers: 'Usuarios activos',
};

const kpiAccents = [
  tokens.primary,
  tokens.secondary,
  tokens.primaryStrong,
  tokens.warning,
  tokens.primaryDeep,
];

type ColumnDef = { key: string; label: string };

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);

  useEffect(() => {
    api.get('/reports').then((res) => setData(res.data.data)).catch(() => undefined);
  }, []);

  if (!data) {
    return <Typography color="text.secondary">Cargando reportes…</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reportes
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Consultas y indicadores para apoyar la toma de decisiones.
      </Typography>

      <Grid container spacing={2} mb={2.5}>
        {Object.entries(data.kpis).map(([key, value], index) => (
          <Grid key={key} size={{ xs: 12, sm: 6, md: 2.4 }}>
            <InfoCard
              sx={{
                position: 'relative',
                minHeight: 118,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: 4,
                  bgcolor: kpiAccents[index % kpiAccents.length],
                },
              }}
            >
              <CardContent sx={{ pl: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{ color: tokens.textOnLightMuted, fontWeight: 700, letterSpacing: 0.3 }}
                >
                  {kpiLabels[key] || key}
                </Typography>
                <Typography variant="h4" sx={{ color: tokens.textOnLight, fontWeight: 800, mt: 0.75 }}>
                  {value}
                </Typography>
              </CardContent>
            </InfoCard>
          </Grid>
        ))}
      </Grid>

      <ReportTable
        title="1. Ocupación por laboratorio"
        rows={data.occupancyByLab}
        columns={cols([
          'code',
          'name',
          'capacity',
          'total_reservations',
          'confirmed_or_done',
          'no_shows',
          'avg_attendees',
        ])}
      />
      <ReportTable
        title="2. Equipo más utilizado"
        rows={data.topEquipment}
        columns={cols([
          'inventoryCode',
          'name',
          'category',
          'laboratoryCode',
          'times_used',
          'total_quantity',
        ])}
      />
      <ReportTable
        title="3. Incidencias por estado y severidad"
        rows={data.incidentsByStatus}
        columns={cols(['status', 'severity', 'total', 'labs_affected', 'equipment_affected'])}
        formatCell={(key, value) => {
          if (key === 'status') return labelOf(incidentStatusLabels, String(value));
          if (key === 'severity') return labelOf(severityLabels, String(value));
          return String(value ?? '');
        }}
      />
      <ReportTable
        title="4. Demanda por hora"
        rows={data.reservationsByHour}
        columns={cols(['hour_slot', 'reservations', 'labs_used', 'unique_users'])}
        formatCell={(key, value) => {
          if (key === 'hour_slot' && value !== '' && value != null) {
            return `${value}:00`;
          }
          return String(value ?? '');
        }}
      />
    </Box>
  );
}

function cols(keys: string[]): ColumnDef[] {
  return keys.map((key) => ({
    key,
    label: reportColumnLabels[key] || key,
  }));
}

function ReportTable({
  title,
  rows,
  columns,
  formatCell,
}: {
  title: string;
  rows: Array<Record<string, string | number>>;
  columns: ColumnDef[];
  formatCell?: (key: string, value: string | number) => string;
}) {
  return (
    <InfoCard sx={{ mb: 2, overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${tokens.borderLight}`,
          background: `linear-gradient(90deg, ${tokens.surfaceMuted} 0%, #fff 70%)`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tokens.primary }} />
          <Typography variant="h6" sx={{ color: tokens.textOnLight }}>
            {title}
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ overflow: 'auto' }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key}>{c.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx} hover>
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    {formatCell
                      ? formatCell(c.key, row[c.key] ?? '')
                      : String(row[c.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ color: tokens.textOnLightMuted }}>
                  Sin datos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </InfoCard>
  );
}
