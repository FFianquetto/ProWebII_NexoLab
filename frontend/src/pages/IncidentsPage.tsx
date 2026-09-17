import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ResourcePage, { editActionSx } from '../components/ResourcePage';
import api from '../api/client';
import type { Equipment, Incident, Laboratory } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  incidentKindLabels,
  severityLabels,
  incidentStatusLabels,
} from '../constants/labels';
import {
  IncidentStatusChip,
  RoleChip,
  SeverityChip,
} from '../components/StatusChip';
import { isAdmin } from '../constants/permissions';
import { getApiErrorMessage } from '../utils/apiError';
import { tokens } from '../theme/tokens';
import { FormEvent, useEffect, useState } from 'react';

type FaultKind = 'LABORATORY' | 'EQUIPMENT';

export default function IncidentsPage() {
  const { user } = useAuth();
  const admin = isAdmin(user?.role);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [tab, setTab] = useState<FaultKind>('LABORATORY');

  useEffect(() => {
    Promise.all([api.get('/laboratories'), api.get('/equipment')])
      .then(([l, e]) => {
        setLabs(l.data.data);
        setEquipment(e.data.data);
      })
      .catch(() => undefined);
  }, []);

  if (!admin) {
    return <ReportFaultForm labs={labs} equipment={equipment} userId={user?.id || ''} />;
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Solo lectura del contenido. Puedes <strong>marcar como resuelto</strong> o{' '}
        <strong>eliminar</strong> el reporte; no se edita el texto del usuario.
      </Alert>

      <Tabs
        value={tab}
        onChange={(_e, value: FaultKind) => setTab(value)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="LABORATORY" label="Fallas de laboratorio" />
        <Tab value="EQUIPMENT" label="Fallas de equipo" />
      </Tabs>

      <AdminIncidentsTable key={tab} kind={tab} />
    </Box>
  );
}

function AdminIncidentsTable({ kind }: { kind: FaultKind }) {
  return (
    <ResourcePage<Incident>
      title={kind === 'LABORATORY' ? 'Fallas de laboratorio' : 'Fallas de equipo'}
      endpoint={`/incidents?kind=${kind}`}
      canCreate={false}
      canEdit={() => false}
      canDelete={() => true}
      emptyForm={{}}
      columns={[
        { key: 'title', label: 'Título', primary: true },
        {
          key: 'description',
          label: 'Descripción',
          render: (row) => (
            <Typography variant="body2" sx={{ maxWidth: 280, color: tokens.textOnLight }}>
              {row.description}
            </Typography>
          ),
        },
        {
          key: 'severity',
          label: 'Severidad',
          render: (row) => <SeverityChip severity={row.severity} />,
        },
        {
          key: 'status',
          label: 'Estado',
          render: (row) => <IncidentStatusChip status={row.status} />,
        },
        {
          key: 'target',
          label: kind === 'LABORATORY' ? 'Laboratorio' : 'Equipo',
          render: (row) =>
            kind === 'LABORATORY'
              ? row.laboratory
                ? `${row.laboratory.code} — ${row.laboratory.name}`
                : '—'
              : row.equipment
                ? `${row.equipment.inventoryCode} — ${row.equipment.name}`
                : '—',
        },
        {
          key: 'reportedBy',
          label: 'Reportó',
          render: (row) => (
            <Stack direction="row" spacing={1} alignItems="center">
              <span>{row.reportedBy?.fullName || row.reportedById}</span>
              <RoleChip role={row.reportedBy?.role} />
            </Stack>
          ),
        },
      ]}
      renderExtraActions={(row, { reload }) =>
        row.status === 'OPEN' || row.status === 'IN_PROGRESS' ? (
          <Tooltip title="Marcar resuelto">
            <IconButton
              aria-label="Resolver"
              sx={{
                ...editActionSx,
                bgcolor: '#86EFAC',
                borderColor: '#16A34A',
                color: '#14532D',
                '&:hover': { bgcolor: '#4ADE80', color: '#14532D' },
              }}
              onClick={async () => {
                await api.put(`/incidents/${row.id}`, { status: 'RESOLVED' });
                await reload();
              }}
            >
              <CheckCircleOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null
      }
      renderForm={() => null}
    />
  );
}

function ReportFaultForm({
  labs,
  equipment,
  userId,
}: {
  labs: Laboratory[];
  equipment: Equipment[];
  userId: string;
}) {
  const [kind, setKind] = useState<FaultKind>('LABORATORY');
  const [values, setValues] = useState<Partial<Incident>>({
    title: '',
    description: '',
    severity: 'MEDIUM',
    laboratoryId: null,
    equipmentId: null,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!values.title?.trim() || values.title.trim().length < 2) {
      setError('Ingresa un título descriptivo.');
      return;
    }
    if (!values.description?.trim() || values.description.trim().length < 5) {
      setError('Describe el problema con al menos 5 caracteres.');
      return;
    }
    if (kind === 'LABORATORY' && !values.laboratoryId) {
      setError('Selecciona el laboratorio afectado.');
      return;
    }
    if (kind === 'EQUIPMENT' && !values.equipmentId) {
      setError('Selecciona el equipo afectado.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/incidents', {
        title: values.title.trim(),
        description: values.description.trim(),
        kind,
        severity: values.severity || 'MEDIUM',
        status: 'OPEN',
        laboratoryId: values.laboratoryId ? String(values.laboratoryId) : null,
        equipmentId: kind === 'EQUIPMENT' && values.equipmentId ? String(values.equipmentId) : null,
        reportedById: userId,
      });
      setSuccess(
        `Reporte de ${kind === 'LABORATORY' ? 'laboratorio' : 'equipo'} enviado. El administrador lo revisará.`,
      );
      setValues({
        title: '',
        description: '',
        severity: 'MEDIUM',
        laboratoryId: null,
        equipmentId: null,
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo enviar el reporte.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <Typography
        variant="h4"
        color="text.primary"
        textAlign="center"
        sx={{ mb: 2.5, width: '100%', maxWidth: 640 }}
      >
        Reportar falla
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 640 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2, width: '100%', maxWidth: 640 }}
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      <Paper
        component="form"
        onSubmit={onSubmit}
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: `${tokens.radiusInteractive}px`,
          width: '100%',
          maxWidth: 640,
        }}
      >
        <Stack spacing={2}>
          <TextField
            select
            label="Tipo de reporte"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as FaultKind;
              setKind(next);
              setValues((prev) => ({
                ...prev,
                laboratoryId: null,
                equipmentId: null,
              }));
            }}
            fullWidth
            required
          >
            {Object.entries(incidentKindLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          <FaultFields
            values={values}
            setValues={setValues}
            labs={labs}
            equipment={equipment}
            kind={kind}
            lockKind
            showStatus={false}
          />

          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar reporte'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function FaultFields({
  values,
  setValues,
  labs,
  equipment,
  kind,
  showStatus,
}: {
  values: Partial<Incident>;
  setValues: (v: Partial<Incident>) => void;
  labs: Laboratory[];
  equipment: Equipment[];
  kind: FaultKind;
  lockKind?: boolean;
  showStatus: boolean;
}) {
  const eqForLab = values.laboratoryId
    ? equipment.filter((eq) => eq.laboratoryId === values.laboratoryId)
    : equipment;

  return (
    <>
      <TextField
        label="Título"
        value={values.title || ''}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
        required
        fullWidth
      />
      <TextField
        label="Descripción del problema"
        value={values.description || ''}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        required
        fullWidth
        multiline
        minRows={3}
      />
      <TextField
        select
        label="Severidad"
        value={values.severity || 'MEDIUM'}
        onChange={(e) =>
          setValues({ ...values, severity: e.target.value as Incident['severity'] })
        }
        fullWidth
      >
        {Object.entries(severityLabels).map(([value, label]) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      {showStatus && (
        <TextField
          select
          label="Estado"
          value={values.status || 'OPEN'}
          onChange={(e) =>
            setValues({ ...values, status: e.target.value as Incident['status'] })
          }
          fullWidth
        >
          {Object.entries(incidentStatusLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      )}

      {(kind === 'LABORATORY' || kind === 'EQUIPMENT') && (
        <TextField
          select
          label={kind === 'LABORATORY' ? 'Laboratorio afectado' : 'Laboratorio del equipo (opcional)'}
          value={values.laboratoryId ?? ''}
          onChange={(e) =>
            setValues({
              ...values,
              laboratoryId: e.target.value ? e.target.value : null,
              equipmentId: kind === 'EQUIPMENT' ? null : values.equipmentId,
            })
          }
          required={kind === 'LABORATORY'}
          fullWidth
        >
          {kind === 'EQUIPMENT' && <MenuItem value="">Ninguno</MenuItem>}
          {labs.map((lab) => (
            <MenuItem key={lab.id} value={lab.id}>
              {lab.code} - {lab.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {kind === 'EQUIPMENT' && (
        <TextField
          select
          label="Equipo afectado"
          value={values.equipmentId ?? ''}
          onChange={(e) =>
            setValues({ ...values, equipmentId: e.target.value ? e.target.value : null })
          }
          required
          fullWidth
        >
          {eqForLab.map((eq) => (
            <MenuItem key={eq.id} value={eq.id}>
              {eq.inventoryCode} - {eq.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </>
  );
}
