import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import type { Laboratory } from '../types';
import { labStatusLabels } from '../constants/labels';
import { OccupancyChip, LabStatusChip } from '../components/StatusChip';
import { useAuth } from '../context/AuthContext';
import { appRoutes } from '../constants/routes';
import { Link as RouterLink } from 'react-router-dom';
import { isStudent } from '../constants/permissions';
import { formatFreeAtTime, suggestEndFromStart } from '../utils/reservationTime';
import api from '../api/client';
import { getApiErrorMessage } from '../utils/apiError';
import { tokens } from '../theme/tokens';

/** Texto auxiliar sobre fondo blanco (el theme es dark; text.secondary queda ilegible). */
const onLightHintSx = {
  color: tokens.textOnLight,
  fontWeight: 600,
  opacity: 0.92,
} as const;

function FreeAtHint({ freeAt }: { freeAt?: string | null }) {
  if (!freeAt) return null;
  const t = formatFreeAtTime(freeAt);
  if (!t) return null;
  return (
    <Typography variant="caption" sx={onLightHintSx}>
      Libre desde {t}
    </Typography>
  );
}

function JoinButton({
  lab,
  busy,
  onJoin,
}: {
  lab: Laboratory;
  busy: boolean;
  onJoin: (lab: Laboratory) => void;
}) {
  return (
    <Button
      size="small"
      variant="contained"
      color="warning"
      disabled={busy}
      onClick={() => onJoin(lab)}
      startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
      sx={{
        mt: 0.25,
        textTransform: 'none',
        fontWeight: 700,
        px: 1.5,
        py: 0.5,
        minHeight: 32,
      }}
    >
      Solicitar también
    </Button>
  );
}

function DemandCell({
  lab,
  showStudentActions,
  joiningId,
  onJoin,
}: {
  lab: Laboratory;
  showStudentActions: boolean;
  joiningId: string | null;
  onJoin: (lab: Laboratory) => void;
}) {
  const d = lab.demand;
  if (!d) return <Typography variant="body2">—</Typography>;

  const busy = joiningId === lab.id;
  const canJoin =
    showStudentActions &&
    !d.alreadyJoined &&
    (d.canJoin || Boolean(d.joinStartsAt)) &&
    Boolean(d.joinStartsAt);

  if (d.occupancy === 'GATHERING') {
    const missing = Math.max(0, (d.required || 5) - (d.pendingStudents || 0));
    return (
      <Stack spacing={0.75} alignItems="flex-start">
        <OccupancyChip occupancy="GATHERING" label="Solicitado" />
        <FreeAtHint freeAt={d.freeAt} />
        {showStudentActions && d.alreadyJoined && (
          <Typography variant="caption" sx={onLightHintSx}>
            Ya formas parte de esta solicitud
          </Typography>
        )}
        {showStudentActions && !d.alreadyJoined && (
          <Typography variant="caption" sx={onLightHintSx}>
            {missing > 0
              ? `Mínimo 5 para reservar · faltan ${missing}`
              : 'Ya reservado · pueden unirse más'}
          </Typography>
        )}
        {canJoin && <JoinButton lab={lab} busy={busy} onJoin={onJoin} />}
      </Stack>
    );
  }

  if (d.occupancy === 'FREE') {
    return <OccupancyChip occupancy="FREE" label="Disponible" />;
  }

  if (d.occupancy === 'UNAVAILABLE') {
    return <OccupancyChip occupancy="UNAVAILABLE" label={d.label || 'No disponible'} />;
  }

  // OCCUPIED: si es grupo de alumnos, siguen pudiendo unirse
  return (
    <Stack spacing={0.75} alignItems="flex-start">
      <OccupancyChip occupancy="OCCUPIED" label={d.label || 'Reservado'} />
      <FreeAtHint freeAt={d.freeAt} />
      {d.alreadyJoined && showStudentActions && (
        <Typography variant="caption" sx={onLightHintSx}>
          Ya formas parte de esta solicitud
        </Typography>
      )}
      {canJoin && showStudentActions && !d.alreadyJoined && (
        <Typography variant="caption" sx={onLightHintSx}>
          Ya reservado · puedes unirte (hasta la capacidad del lab)
        </Typography>
      )}
      {canJoin && !d.alreadyJoined && (
        <JoinButton lab={lab} busy={busy} onJoin={onJoin} />
      )}
      {!canJoin && !showStudentActions && (
        <Typography variant="caption" sx={onLightHintSx}>
          No disponible
        </Typography>
      )}
    </Stack>
  );
}

export default function LaboratoriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const student = isStudent(user?.role);
  const [refreshKey, setRefreshKey] = useState(0);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const handleJoinRequest = async (lab: Laboratory) => {
    const d = lab.demand;
    if (!student || !d?.joinStartsAt) return;

    setJoiningId(lab.id);
    setJoinMsg(null);
    try {
      // Siempre recalcular fin a +1h59; no reutilizar endsAt crudo del lab (puede fallar Zod)
      const startsAt = d.joinStartsAt;
      const endsAt = suggestEndFromStart(startsAt);
      const { data } = await api.post('/reservations', {
        laboratoryId: lab.id,
        title: `Solicitud ${lab.code}`,
        purpose: 'Unirse a la solicitud del laboratorio',
        startsAt,
        endsAt,
        attendees: 1,
      });
      const progress = data?.data?.groupProgress?.message;
      const status = data?.data?.status;
      setJoinMsg({
        type: 'success',
        text:
          progress ||
          (status === 'CONFIRMED'
            ? `Listo: ${lab.code} quedó reservado (grupo completo).`
            : `Solicitud en curso en ${lab.code}. Aparece en Reservas como pendiente hasta completar el mínimo de 5.`),
      });
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setJoinMsg({
        type: 'error',
        text: getApiErrorMessage(err, 'No se pudo unir a la solicitud.'),
      });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        {isAdmin ? (
          <>
            Administra el estado de cada laboratorio: <strong>Disponible</strong> o{' '}
            <strong>Mantenimiento</strong>. Capacidad <strong>20–30</strong>.
          </>
        ) : (
          <>
            <strong>Disponibilidad:</strong>{' '}
            <Box component="span" sx={{ color: '#16A34A', fontWeight: 800 }}>
              Verde
            </Box>{' '}
            = disponible ·{' '}
            <Box component="span" sx={{ color: '#EA580C', fontWeight: 800 }}>
              Naranja
            </Box>{' '}
            = solicitado por alumnos (aún no se llena) ·{' '}
            <Box component="span" sx={{ color: '#DC2626', fontWeight: 800 }}>
              Rojo
            </Box>{' '}
            = reservado ·{' '}
            <Box component="span" sx={{ color: '#64748B', fontWeight: 800 }}>
              Gris
            </Box>{' '}
            = no disponible. Capacidad <strong>20–30</strong>. Horario:{' '}
            <strong>8:00 a.m.–8:00 p.m.</strong> (préstamo hasta 10:00 p.m.).
            {student && (
              <>
                {' '}
                Con <strong>mín. 5</strong> queda reservado, pero otros alumnos pueden{' '}
                <strong>Solicitar también</strong> y unirse. Si ya tienes una solicitud (~2 h), no
                puedes pedir otro lab en ese mismo lapso.
              </>
            )}
            {!student && (
              <>
                {' '}
                Pedir un lab en{' '}
                <RouterLink to={appRoutes.reservations}>Reservas</RouterLink>.
              </>
            )}
            {student && (
              <>
                {' '}
                También puedes crear una solicitud nueva en{' '}
                <RouterLink to={appRoutes.reservations}>Reservas</RouterLink>.
              </>
            )}
          </>
        )}
      </Alert>

      {joinMsg && (
        <Alert
          severity={joinMsg.type}
          sx={{ mb: 2 }}
          onClose={() => setJoinMsg(null)}
        >
          {joinMsg.text}
        </Alert>
      )}

      <ResourcePage<Laboratory>
        key={refreshKey}
        title="Laboratorios"
        endpoint="/laboratories"
        canCreate={isAdmin}
        canEdit={() => false}
        canDelete={() => false}
        emptyForm={{
          code: '',
          name: '',
          building: '',
          floor: '',
          capacity: 24,
          status: 'AVAILABLE',
          description: '',
        }}
        columns={[
          { key: 'code', label: 'Código', primary: true },
          { key: 'name', label: 'Nombre' },
          { key: 'building', label: 'Edificio' },
          {
            key: 'capacity',
            label: 'Capacidad',
            render: (row) => `${row.capacity} pers.`,
          },
          ...(isAdmin
            ? [
                {
                  key: 'status',
                  label: 'Estado',
                  render: (row: Laboratory) => <LabStatusChip status={row.status} />,
                },
              ]
            : [
                {
                  key: 'demand',
                  label: 'Disponibilidad',
                  render: (row: Laboratory) => (
                    <DemandCell
                      lab={row}
                      showStudentActions={student}
                      joiningId={joiningId}
                      onJoin={handleJoinRequest}
                    />
                  ),
                },
              ]),
        ]}
        renderExtraActions={
          isAdmin
            ? (row, { reload }) => {
                const busy =
                  row.demand?.occupancy === 'OCCUPIED' ||
                  row.demand?.occupancy === 'GATHERING';
                const toMaintenance = row.status === 'AVAILABLE';
                return (
                  <Button
                    size="small"
                    variant="contained"
                    color={toMaintenance ? (busy ? 'inherit' : 'warning') : 'success'}
                    disabled={toMaintenance && busy}
                    sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                    onClick={async () => {
                      try {
                        setJoinMsg(null);
                        const nextStatus = toMaintenance ? 'MAINTENANCE' : 'AVAILABLE';
                        await api.put(`/laboratories/${row.id}`, {
                          status: nextStatus,
                        });
                        setJoinMsg({
                          type: 'success',
                          text:
                            nextStatus === 'MAINTENANCE'
                              ? `Se puso en mantenimiento: ${row.code} — ${row.name}.`
                              : `Quedó disponible: ${row.code} — ${row.name}.`,
                        });
                        await reload();
                      } catch (err: unknown) {
                        setJoinMsg({
                          type: 'error',
                          text: getApiErrorMessage(err, 'No se pudo actualizar el laboratorio.'),
                        });
                      }
                    }}
                  >
                    {toMaintenance ? (busy ? 'En uso' : 'Mantenimiento') : 'Disponible'}
                  </Button>
                );
              }
            : undefined
        }
        renderForm={(values, setValues) => (
          <>
            <TextField
              label="Código"
              value={values.code || ''}
              onChange={(e) => setValues({ ...values, code: e.target.value })}
              required
              fullWidth
              disabled={!isAdmin}
            />
            <TextField
              label="Nombre"
              value={values.name || ''}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              required
              fullWidth
              disabled={!isAdmin}
            />
            <TextField
              label="Edificio"
              value={values.building || ''}
              onChange={(e) => setValues({ ...values, building: e.target.value })}
              required
              fullWidth
              disabled={!isAdmin}
            />
            <TextField
              label="Piso"
              value={values.floor || ''}
              onChange={(e) => setValues({ ...values, floor: e.target.value })}
              fullWidth
              disabled={!isAdmin}
            />
            <TextField
              label="Capacidad"
              type="number"
              value={values.capacity ?? 24}
              onChange={(e) => setValues({ ...values, capacity: Number(e.target.value) })}
              required
              fullWidth
              disabled={!isAdmin}
              helperText="Entre 20 y 30 personas (límite del laboratorio)"
              slotProps={{ htmlInput: { min: 20, max: 30 } }}
            />
            <TextField
              select
              label="Estado"
              value={values.status || 'AVAILABLE'}
              onChange={(e) =>
                setValues({ ...values, status: e.target.value as Laboratory['status'] })
              }
              fullWidth
              disabled={!isAdmin}
            >
              {Object.entries(labStatusLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Descripción"
              value={values.description || ''}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
              fullWidth
              multiline
              minRows={2}
              disabled={!isAdmin}
            />
          </>
        )}
      />
    </>
  );
}
