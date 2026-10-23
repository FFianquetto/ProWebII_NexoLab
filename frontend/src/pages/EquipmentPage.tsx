import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import ResourcePage from '../components/ResourcePage';
import api from '../api/client';
import type { Equipment, Laboratory, ReservationEquipment } from '../types';
import { equipmentStatusLabels } from '../constants/labels';
import { EquipmentStatusChip } from '../components/StatusChip';
import { useAuth } from '../context/AuthContext';
import { appRoutes } from '../constants/routes';
import { isAdmin, isStudent, isTeacher } from '../constants/permissions';
import { getApiErrorMessage } from '../utils/apiError';
import { formatFreeAtTime } from '../utils/reservationTime';
import { tokens } from '../theme/tokens';

const LOAN_CATEGORIES = ['Computadora', 'Casco VR', 'Bocina', 'Multímetro'] as const;

type InventoryRow = Equipment & { inUse?: boolean };

/** Texto auxiliar sobre fondo blanco (el theme es dark; text.secondary queda ilegible). */
const onLightHintSx = {
  color: tokens.textOnLight,
  fontWeight: 600,
  opacity: 0.92,
} as const;

/** Botón de préstamo: va a Equipos prestados con la categoría ya seleccionada. */
function BorrowButton({
  row,
  onBorrow,
}: {
  row: InventoryRow;
  onBorrow: (row: InventoryRow) => void;
}) {
  return (
    <Button
      size="small"
      variant="contained"
      color="primary"
      onClick={() => onBorrow(row)}
      sx={{
        mt: 0.25,
        textTransform: 'none',
        fontWeight: 700,
        px: 1.5,
        py: 0.5,
        minHeight: 32,
      }}
    >
      Pedir prestado
    </Button>
  );
}

/** Misma estructura que DemandCell en Laboratorios: chip + pista + botón según estado. */
function LoanCell({
  row,
  showLoanActions,
  hasActiveLoan,
  myLoanEndsAt,
  onBorrow,
}: {
  row: InventoryRow;
  showLoanActions: boolean;
  hasActiveLoan: boolean;
  myLoanEndsAt: string | null;
  onBorrow: (row: InventoryRow) => void;
}) {
  const inUse = Boolean(row.inUse) || row.status === 'IN_USE';
  const available = row.status === 'AVAILABLE' && !inUse;
  const canBorrow = showLoanActions && available && !hasActiveLoan;

  if (!showLoanActions) {
    return <EquipmentStatusChip status={inUse ? 'IN_USE' : row.status} />;
  }

  if (available) {
    return (
      <Stack spacing={0.75} alignItems="flex-start">
        <EquipmentStatusChip status="AVAILABLE" />
        {hasActiveLoan && (
          <Typography variant="caption" sx={onLightHintSx}>
            Ya tienes un equipo en préstamo
            {myLoanEndsAt ? ` · libre desde ${formatFreeAtTime(myLoanEndsAt)}` : ''}
          </Typography>
        )}
        {canBorrow && <BorrowButton row={row} onBorrow={onBorrow} />}
      </Stack>
    );
  }

  if (inUse) {
    return (
      <Stack spacing={0.75} alignItems="flex-start">
        <EquipmentStatusChip status="IN_USE" />
        <Typography variant="caption" sx={onLightHintSx}>
          Prestado · prueba otro de la misma categoría
        </Typography>
      </Stack>
    );
  }

  // MAINTENANCE / BROKEN
  return (
    <Stack spacing={0.75} alignItems="flex-start">
      <EquipmentStatusChip status={row.status} />
      <Typography variant="caption" sx={onLightHintSx}>
        No disponible
      </Typography>
    </Stack>
  );
}

export default function EquipmentPage() {
  const { user } = useAuth();
  const admin = isAdmin(user?.role);
  const student = isStudent(user?.role);
  const teacher = isTeacher(user?.role);
  const canLoan = student || teacher;
  const navigate = useNavigate();
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [assignments, setAssignments] = useState<ReservationEquipment[]>([]);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    api.get('/laboratories').then((r) => setLabs(r.data.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!canLoan) return;
    api
      .get('/reservation-equipment')
      .then((r) => setAssignments(r.data.data as ReservationEquipment[]))
      .catch(() => undefined);
  }, [canLoan]);

  const now = Date.now();

  /** Préstamo activo del usuario actual (misma regla que en Equipos prestados). */
  const myActiveLoan = useMemo(() => {
    if (!canLoan) return null;
    return (
      assignments.find((a) => {
        const ends = a.endsAt ? new Date(a.endsAt).getTime() : 0;
        return a.userId === user?.id && ends > now;
      }) || null
    );
  }, [assignments, canLoan, user?.id, now]);
  const hasActiveLoan = Boolean(myActiveLoan);

  const handleBorrow = (row: InventoryRow) => {
    if (!canLoan) return;
    navigate(appRoutes.reservationEquipment, { state: { category: row.category } });
  };

  const endpoint = category
    ? `/equipment?category=${encodeURIComponent(category)}`
    : '/equipment';

  return (
    <>
      {admin && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Inventario de préstamo: <strong>24 equipos</strong> (6 por categoría). Filtra por
          categoría o deja “Todas”. No se puede poner en mantenimiento un equipo en uso.
        </Alert>
      )}
      {canLoan && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Préstamo individual (1 a 1):</strong> pulsa <strong>Pedir prestado</strong> en
          el equipo que necesites (Computadora, Casco VR, Bocina o Multímetro). No necesitas
          reservar un laboratorio: el préstamo dura <strong>2 h</strong> y solo puedes tener{' '}
          <strong>un equipo</strong> a la vez. También puedes pedirlo en{' '}
          <RouterLink to={appRoutes.reservationEquipment}>Equipos prestados</RouterLink>.
        </Alert>
      )}
      {hasActiveLoan && myActiveLoan && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Ya tienes un equipo en préstamo
          {myActiveLoan.equipment?.name ? ` (${myActiveLoan.equipment.name})` : ''}. Espera a
          que termine (~2 h) o libéralo en Equipos prestados para pedir otro.
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo('')}>
          {info}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {admin && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} alignItems="flex-start">
          <TextField
            select
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            size="small"
            sx={{ minWidth: 220, bgcolor: 'background.paper', borderRadius: 1 }}
          >
            <MenuItem value="">Todas (24)</MenuItem>
            {LOAN_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat} (6)
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}

      <ResourcePage<InventoryRow>
        key={endpoint}
        title={admin ? 'Inventario' : 'Equipos'}
        endpoint={endpoint}
        canCreate={false}
        canEdit={() => false}
        canDelete={() => false}
        emptyForm={{
          inventoryCode: '',
          name: '',
          category: 'Computadora',
          status: 'AVAILABLE',
          laboratoryId: labs[0]?.id || '',
          notes: '',
        }}
        columns={[
          { key: 'inventoryCode', label: 'Código', primary: true },
          { key: 'name', label: 'Nombre' },
          { key: 'category', label: 'Categoría' },
          {
            key: 'laboratory',
            label: 'Laboratorio',
            render: (row) => row.laboratory?.code || row.laboratoryId,
          },
          ...(admin
            ? [
                {
                  key: 'status',
                  label: 'Estado',
                  render: (row: InventoryRow) => <EquipmentStatusChip status={row.status} />,
                },
              ]
            : [
                {
                  key: 'status',
                  label: 'Disponibilidad',
                  render: (row: InventoryRow) => (
                    <LoanCell
                      row={row}
                      showLoanActions={canLoan}
                      hasActiveLoan={hasActiveLoan}
                      myLoanEndsAt={myActiveLoan?.reservation?.endsAt || null}
                      onBorrow={handleBorrow}
                    />
                  ),
                },
              ]),
        ]}
        renderExtraActions={
          admin
            ? (row, { reload }) => {
                const busy = Boolean(row.inUse) || row.status === 'IN_USE';
                const toMaintenance = row.status === 'AVAILABLE';
                const label = toMaintenance
                  ? busy
                    ? 'En uso'
                    : 'Mantenimiento'
                  : 'Disponible';
                return (
                  <Button
                    size="small"
                    variant="contained"
                    color={toMaintenance ? (busy ? 'inherit' : 'warning') : 'success'}
                    disabled={toMaintenance && busy}
                    sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                    onClick={async () => {
                      try {
                        setError('');
                        setInfo('');
                        const nextStatus = toMaintenance ? 'MAINTENANCE' : 'AVAILABLE';
                        await api.put(`/equipment/${row.id}`, { status: nextStatus });
                        setInfo(
                          nextStatus === 'MAINTENANCE'
                            ? `Se puso en mantenimiento: ${row.name} (${row.inventoryCode}).`
                            : `Quedó disponible: ${row.name} (${row.inventoryCode}).`,
                        );
                        await reload();
                      } catch (err: unknown) {
                        setError(getApiErrorMessage(err, 'No se pudo actualizar el equipo.'));
                      }
                    }}
                  >
                    {label}
                  </Button>
                );
              }
            : undefined
        }
        toPayload={(values) => ({
          inventoryCode: values.inventoryCode,
          name: values.name,
          category: values.category,
          status: values.status,
          laboratoryId: String(values.laboratoryId),
          notes: values.notes || null,
        })}
        renderForm={(values, setValues) => (
          <>
            <TextField
              label="Código de inventario"
              value={values.inventoryCode || ''}
              onChange={(e) => setValues({ ...values, inventoryCode: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Nombre"
              value={values.name || ''}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              select
              label="Categoría"
              value={values.category || 'Computadora'}
              onChange={(e) => setValues({ ...values, category: e.target.value })}
              required
              fullWidth
            >
              {LOAN_CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Laboratorio"
              value={values.laboratoryId || ''}
              onChange={(e) => setValues({ ...values, laboratoryId: e.target.value })}
              required
              fullWidth
            >
              {labs.map((lab) => (
                <MenuItem key={lab.id} value={lab.id}>
                  {lab.code} — {lab.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Estado"
              value={values.status || 'AVAILABLE'}
              onChange={(e) =>
                setValues({ ...values, status: e.target.value as Equipment['status'] })
              }
              fullWidth
            >
              {Object.entries(equipmentStatusLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notas"
              value={values.notes || ''}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
              fullWidth
              multiline
              minRows={2}
            />
          </>
        )}
      />
    </>
  );
}
