import { useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import ResourcePage from '../components/ResourcePage';
import api from '../api/client';
import type { Equipment, Laboratory } from '../types';
import { equipmentStatusLabels } from '../constants/labels';
import { EquipmentStatusChip } from '../components/StatusChip';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../constants/permissions';
import { getApiErrorMessage } from '../utils/apiError';

const LOAN_CATEGORIES = ['Computadora', 'Casco VR', 'Bocina', 'Multímetro'] as const;

type InventoryRow = Equipment & { inUse?: boolean };

export default function EquipmentPage() {
  const { user } = useAuth();
  const admin = isAdmin(user?.role);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    api.get('/laboratories').then((r) => setLabs(r.data.data)).catch(() => undefined);
  }, []);

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
          {
            key: 'status',
            label: 'Estado',
            render: (row) => <EquipmentStatusChip status={row.status} />,
          },
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
