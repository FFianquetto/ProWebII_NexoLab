import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AssessmentIcon from '@mui/icons-material/Assessment';
import api from '../api/client';
import type { Laboratory, Report, ReportsData } from '../types';
import { tokens } from '../theme/tokens';
import InfoCard from '../components/InfoCard';
import { deleteActionSx, editActionSx } from '../components/ResourcePage';
import { ReportTypeChip, RoleChip } from '../components/StatusChip';
import {
  incidentStatusLabels,
  labelOf,
  reportColumnLabels,
  reportTypeLabels,
  severityLabels,
} from '../constants/labels';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';

const kpiLabels: Record<string, string> = {
  laboratories: 'Laboratorios',
  equipment: 'Equipos',
  activeReservations: 'Reservas activas',
  openIncidents: 'Incidencias abiertas',
  activeUsers: 'Usuarios activos',
  generatedReports: 'Reportes generados',
};

const kpiAccents = [
  tokens.primary,
  tokens.secondary,
  tokens.primaryStrong,
  tokens.warning,
  tokens.primaryDeep,
  '#00B4D8',
];

type ColumnDef = { key: string; label: string };

export default function ReportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReportsData | null>(null);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const emptyForm = {
    title: '',
    type: 'GENERAL',
    laboratoryId: '',
    summary: '',
    notes: '',
  };
  const [formValues, setFormValues] = useState(emptyForm);

  const canCreateReport = user?.role === 'ADMIN';

  const loadData = async () => {
    try {
      const [repRes, labRes] = await Promise.all([
        api.get('/reports'),
        api.get('/laboratories').catch(() => ({ data: { data: [] } })),
      ]);
      setData(repRes.data.data);
      setLabs(labRes.data.data || []);
    } catch {
      // Ignorar error de carga inicial silenciosamente
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormValues(emptyForm);
    setFormError('');
    setOpenModal(true);
  };

  const openEditModal = (rep: Report) => {
    setEditingId(rep.id);
    setFormValues({
      title: rep.title,
      type: rep.type,
      laboratoryId: rep.laboratoryId || '',
      summary: rep.summary,
      notes: rep.notes || '',
    });
    setFormError('');
    setOpenModal(true);
  };

  const handleSaveReport = async () => {
    try {
      setFormError('');
      if (!formValues.title || !formValues.summary) {
        setFormError('El título y el resumen del reporte son obligatorios.');
        return;
      }
      const payload = {
        title: formValues.title,
        type: formValues.type,
        laboratoryId: formValues.laboratoryId || null,
        summary: formValues.summary,
        notes: formValues.notes || null,
      };
      if (editingId) {
        await api.put(`/reports/${editingId}`, payload);
      } else {
        await api.post('/reports', payload);
      }
      setOpenModal(false);
      setEditingId(null);
      setFormValues(emptyForm);
      await loadData();
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, 'Error al guardar reporte'));
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('¿Eliminar este reporte oficial?')) return;
    try {
      await api.delete(`/reports/${reportId}`);
      await loadData();
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'No se pudo eliminar el reporte'));
    }
  };

  if (!data) {
    return <Typography color="text.secondary">Cargando reportes e indicadores…</Typography>;
  }

  return (
    <Box sx={{ pb: 6 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'flex-start' }}
        mb={2.5}
        gap={1.5}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Reportes e Indicadores
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Consultas multi-colección y reportes oficiales para toma de decisiones y control institucional.
          </Typography>
        </Box>

        {canCreateReport && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateModal}
            sx={{ flexShrink: 0 }}
          >
            Generar Reporte Oficial
          </Button>
        )}
      </Stack>

      {/* Tarjetas de KPIs */}
      <Grid container spacing={2} mb={3}>
        {Object.entries(data.kpis).map(([key, value], index) => (
          <Grid key={key} size={{ xs: 12, sm: 6, md: 2 }}>
            <InfoCard
              sx={{
                position: 'relative',
                minHeight: 110,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: 4,
                  bgcolor: kpiAccents[index % kpiAccents.length],
                },
              }}
            >
              <CardContent sx={{ pl: 2.5, py: 2 }}>
                <Typography
                  variant="caption"
                  sx={{ color: tokens.textOnLightMuted, fontWeight: 700, letterSpacing: 0.3 }}
                >
                  {kpiLabels[key] || key}
                </Typography>
                <Typography variant="h4" sx={{ color: tokens.textOnLight, fontWeight: 800, mt: 0.5 }}>
                  {value}
                </Typography>
              </CardContent>
            </InfoCard>
          </Grid>
        ))}
      </Grid>

      {/* Historial de Reportes Oficiales Generados */}
      <InfoCard sx={{ mb: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${tokens.borderLight}`,
            background: `linear-gradient(90deg, ${tokens.surfaceMuted} 0%, #fff 70%)`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <AssessmentIcon sx={{ color: tokens.primary }} />
            <Typography variant="h6" sx={{ color: tokens.textOnLight }}>
              Reportes Oficiales Generados (Maestros y Administradores)
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ overflow: 'auto' }}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Laboratorio</TableCell>
                <TableCell>Generado por</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Resumen y Observaciones</TableCell>
                {canCreateReport && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.savedReports && data.savedReports.length > 0 ? (
                data.savedReports.map((rep) => {
                  const isAuthor = rep.createdById === user?.id;
                  const canManage = user?.role === 'ADMIN' || (user?.role === 'TEACHER' && isAuthor);

                  return (
                    <TableRow key={rep.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: tokens.textOnLight }}>
                        {rep.title}
                      </TableCell>
                      <TableCell>
                        <ReportTypeChip type={rep.type} />
                      </TableCell>
                      <TableCell>{rep.laboratory?.code ? `${rep.laboratory.code} - ${rep.laboratory.name}` : 'General'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>{rep.createdBy?.fullName || 'Personal'}</span>
                          <RoleChip role={rep.createdBy?.role} />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {new Date(rep.createdAt).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {rep.summary}
                        </Typography>
                        {rep.notes && (
                          <Typography variant="caption" color="text.secondary">
                            Nota: {rep.notes}
                          </Typography>
                        )}
                      </TableCell>
                      {canCreateReport && (
                        <TableCell align="right">
                          {canManage && (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <IconButton
                                aria-label="Editar reporte"
                                onClick={() => openEditModal(rep)}
                                sx={editActionSx}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                aria-label="Eliminar reporte"
                                onClick={() => handleDeleteReport(rep.id)}
                                sx={deleteActionSx}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={canCreateReport ? 7 : 6} sx={{ color: tokens.textOnLightMuted, py: 3, textAlign: 'center' }}>
                    No se han generado reportes oficiales aún.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </InfoCard>

      {/* Consultas Multi-colección requeridas por la rúbrica */}
      <ReportTable
        title="1. Ocupación por laboratorio (Laboratories + Reservations)"
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
        title="2. Equipo más utilizado en reservas (Equipment + ReservationEquipment + Laboratory)"
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
        title="3. Incidencias por estado y severidad (Incident + Laboratory + Equipment)"
        rows={data.incidentsByStatus}
        columns={cols(['status', 'severity', 'total', 'labs_affected', 'equipment_affected'])}
        formatCell={(key, value) => {
          if (key === 'status') return labelOf(incidentStatusLabels, String(value));
          if (key === 'severity') return labelOf(severityLabels, String(value));
          return String(value ?? '');
        }}
      />

      <ReportTable
        title="4. Demanda horaria de reservas (Reservations + Laboratory + User)"
        rows={data.reservationsByHour}
        columns={cols(['hour_slot', 'reservations', 'labs_used', 'unique_users'])}
        formatCell={(key, value) => {
          if (key === 'hour_slot' && value !== '' && value != null) {
            return `${value}:00`;
          }
          return String(value ?? '');
        }}
      />

      {/* Modal para Generar / Editar Reporte Oficial */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pr: 1,
          }}
        >
          <Typography component="span" variant="h6" fontWeight={700}>
            {editingId ? 'Editar Reporte Oficial' : 'Generar Reporte Oficial'}
          </Typography>
          <IconButton aria-label="Cerrar" onClick={() => setOpenModal(false)} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              label="Título del reporte"
              value={formValues.title}
              onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
              required
              fullWidth
              placeholder="Ej. Análisis de Ocupación Bimestral"
            />

            <TextField
              select
              label="Tipo de reporte"
              value={formValues.type}
              onChange={(e) => setFormValues({ ...formValues, type: e.target.value })}
              fullWidth
            >
              {Object.entries(reportTypeLabels).map(([val, lbl]) => (
                <MenuItem key={val} value={val}>
                  {lbl}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Laboratorio asociado (opcional)"
              value={formValues.laboratoryId}
              onChange={(e) => setFormValues({ ...formValues, laboratoryId: e.target.value })}
              fullWidth
            >
              <MenuItem value="">Todos los laboratorios / General</MenuItem>
              {labs.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.code} - {l.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Resumen ejecutivo y hallazgos"
              value={formValues.summary}
              onChange={(e) => setFormValues({ ...formValues, summary: e.target.value })}
              required
              fullWidth
              multiline
              minRows={3}
              placeholder="Describa los indicadores clave, patrones observados o decisiones recomendadas..."
            />

            <TextField
              label="Notas u observaciones adicionales"
              value={formValues.notes}
              onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveReport}>
            {editingId ? 'Guardar cambios' : 'Guardar y Publicar'}
          </Button>
        </DialogActions>
      </Dialog>
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
    <InfoCard sx={{ mb: 2.5, overflow: 'hidden' }}>
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
