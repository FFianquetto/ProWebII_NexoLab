import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import api from '../api/client';
import { tokens } from '../theme/tokens';
import InfoCard from './InfoCard';
import { getApiErrorMessage } from '../utils/apiError';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  /** En móvil se muestra en la cabecera de la tarjeta */
  primary?: boolean;
}

interface ResourcePageProps<T extends { id: string }> {
  title: string;
  subtitle?: string;
  endpoint: string;
  columns: Column<T>[];
  renderForm: (values: Partial<T>, setValues: (v: Partial<T>) => void, mode: 'create' | 'edit') => ReactNode;
  emptyForm: Partial<T>;
  toPayload?: (values: Partial<T>, mode: 'create' | 'edit') => unknown;
  canCreate?: boolean;
  canEdit?: (row: T) => boolean;
  canDelete?: (row: T) => boolean;
  /** Callback tras guardar con éxito (p. ej. mensaje de progreso grupal). */
  onSaved?: (data: unknown, mode: 'create' | 'edit') => void;
  /** Validación extra antes de enviar; retorna mensaje de error o null. */
  validateBeforeSave?: (
    values: Partial<T>,
    mode: 'create' | 'edit',
  ) => string | null | Promise<string | null>;
  /** Texto del registro en el diálogo de eliminar */
  getDeleteLabel?: (row: T) => string;
  /** Acciones extra por fila (p. ej. Resolver falla). */
  renderExtraActions?: (row: T, ctx: { reload: () => Promise<void> }) => ReactNode;
}

/** Lapicito amarillo / bote rojo — visibles en tablas claras */
export const editActionSx = {
  color: '#92400E',
  bgcolor: '#FCD34D',
  border: '1px solid #F59E0B',
  borderRadius: 1.5,
  width: 38,
  height: 38,
  '&:hover': { bgcolor: '#FBBF24', color: '#78350F' },
} as const;

export const deleteActionSx = {
  color: '#FFFFFF',
  bgcolor: '#DC2626',
  border: '1px solid #B91C1C',
  borderRadius: 1.5,
  width: 38,
  height: 38,
  '&:hover': { bgcolor: '#B91C1C', color: '#FFFFFF' },
} as const;

function cellValue<T extends { id: string }>(row: T, col: Column<T>) {
  if (col.render) return col.render(row);
  return String((row as unknown as Record<string, unknown>)[col.key] ?? '');
}

function RowActions({
  onEdit,
  onDelete,
  showEdit,
  showDelete,
  extra,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  showEdit: boolean;
  showDelete: boolean;
  extra?: ReactNode;
}) {
  if (!showEdit && !showDelete && !extra) return null;
  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
      {extra}
      {showEdit && onEdit && (
        <Tooltip title="Editar">
          <IconButton aria-label="Editar" onClick={onEdit} sx={editActionSx}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {showDelete && onDelete && (
        <Tooltip title="Eliminar">
          <IconButton aria-label="Eliminar" onClick={onDelete} sx={deleteActionSx}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

export default function ResourcePage<T extends { id: string }>({
  title,
  subtitle,
  endpoint,
  columns,
  renderForm,
  emptyForm,
  toPayload,
  canCreate = true,
  canEdit = () => true,
  canDelete = () => true,
  onSaved,
  validateBeforeSave,
  getDeleteLabel,
  renderExtraActions,
}: ResourcePageProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [values, setValues] = useState<Partial<T>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  const baseEndpoint = endpoint.split('?')[0];

  const load = async () => {
    try {
      setError('');
      const { data } = await api.get(endpoint);
      setRows(data.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo cargar la información'));
    }
  };

  useEffect(() => {
    load();
  }, [endpoint]);

  const showActionsColumn = useMemo(() => {
    if (renderExtraActions) return true;
    if (rows.some((row) => canEdit(row) || canDelete(row))) return true;
    return false;
  }, [rows, canEdit, canDelete, renderExtraActions]);

  const openCreate = () => {
    setMode('create');
    setValues(emptyForm);
    setEditingId(null);
    setError('');
    setOpen(true);
  };

  const openEdit = (row: T) => {
    setMode('edit');
    setValues(row);
    setEditingId(row.id);
    setError('');
    setOpen(true);
  };

  const save = async () => {
    try {
      setError('');
      const validationError = await validateBeforeSave?.(values, mode);
      if (validationError) {
        setError(validationError);
        return;
      }
      const payload = toPayload ? toPayload(values, mode) : values;
      if (mode === 'create') {
        const { data } = await api.post(baseEndpoint, payload);
        onSaved?.(data?.data, 'create');
      } else if (editingId != null) {
        const { data } = await api.put(`${baseEndpoint}/${editingId}`, payload);
        onSaved?.(data?.data, 'edit');
      }
      setOpen(false);
      await load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo guardar. Revisa los datos e intenta de nuevo.'));
    }
  };

  const askDelete = (row: T) => setPendingDelete(row);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      setError('');
      await api.delete(`${baseEndpoint}/${pendingDelete.id}`);
      setPendingDelete(null);
      await load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo eliminar el registro.'));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const primaryCol = columns.find((c) => c.primary) || columns[0];
  const secondaryCols = columns.filter((c) => c.key !== primaryCol?.key);
  const deleteLabel = pendingDelete
    ? getDeleteLabel?.(pendingDelete) ||
      (primaryCol ? String(cellValue(pendingDelete, primaryCol)) : pendingDelete.id)
    : '';

  return (
    <Box sx={{ pb: { xs: 10, md: 2 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'flex-end' }}
        mb={2.5}
        gap={1.5}
      >
        <Box>
          <Typography variant="h4" color="text.primary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {!isMobile && canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nuevo
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {isMobile ? (
        <Stack spacing={1.5}>
          {rows.map((row) => {
            const showEdit = canEdit(row);
            const showDelete = canDelete(row);
            return (
              <Card
                key={row.id}
                sx={{
                  borderRadius: `${tokens.radiusInteractive}px`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:active': { transform: 'scale(0.99)' },
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    gutterBottom
                    sx={{ color: tokens.textOnLight }}
                  >
                    {primaryCol ? cellValue(row, primaryCol) : `#${row.id}`}
                  </Typography>
                  <Stack spacing={0.75}>
                    {secondaryCols.map((col) => (
                      <Stack key={col.key} direction="row" justifyContent="space-between" gap={1}>
                        <Typography variant="caption" sx={{ color: tokens.textOnLight, fontWeight: 600 }}>
                          {col.label}
                        </Typography>
                        <Typography
                          variant="body2"
                          textAlign="right"
                          sx={{ wordBreak: 'break-word', color: tokens.textOnLight }}
                        >
                          {cellValue(row, col)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
                {(showEdit || showDelete || renderExtraActions) && (
                  <CardActions sx={{ justifyContent: 'flex-end', px: 1.5, pb: 1.5 }}>
                    <RowActions
                      showEdit={showEdit}
                      showDelete={showDelete}
                      onEdit={() => openEdit(row)}
                      onDelete={() => askDelete(row)}
                      extra={renderExtraActions?.(row, { reload: load })}
                    />
                  </CardActions>
                )}
              </Card>
            );
          })}
          {rows.length === 0 && (
            <InfoCard sx={{ p: 3, textAlign: 'center', boxShadow: 'none' }}>
              <Typography variant="body2" sx={{ color: tokens.textOnLightMuted }}>
                No hay registros todavía.
              </Typography>
            </InfoCard>
          )}
        </Stack>
      ) : (
        <InfoCard sx={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.label}</TableCell>
                ))}
                {showActionsColumn && (
                  <TableCell align="right" sx={{ minWidth: 110 }}>
                    Acciones
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const showEdit = canEdit(row);
                const showDelete = canDelete(row);
                return (
                  <TableRow key={row.id} hover>
                    {columns.map((col) => (
                      <TableCell key={col.key}>{cellValue(row, col)}</TableCell>
                    ))}
                    {showActionsColumn && (
                      <TableCell align="right">
                        <RowActions
                          showEdit={showEdit}
                          showDelete={showDelete}
                          onEdit={() => openEdit(row)}
                          onDelete={() => askDelete(row)}
                          extra={renderExtraActions?.(row, { reload: load })}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + (showActionsColumn ? 1 : 0)}>
                    <Typography variant="body2" sx={{ color: tokens.textOnLightMuted, py: 2 }}>
                      No hay registros todavía.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </InfoCard>
      )}

      {isMobile && canCreate && (
        <Fab
          color="primary"
          aria-label="Nuevo"
          onClick={openCreate}
          sx={{ position: 'fixed', bottom: 88, right: 20, zIndex: 1200 }}
        >
          <AddIcon />
        </Fab>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            overflowX: 'hidden',
            maxWidth: { xs: '100%', sm: 560 },
          },
        }}
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
            {mode === 'create' ? `Crear ${title}` : `Editar ${title}`}
          </Typography>
          <IconButton aria-label="Cerrar" onClick={() => setOpen(false)} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ overflowX: 'hidden' }}>
          <Stack spacing={2} sx={{ mt: 0.5, maxWidth: '100%' }}>
            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            {renderForm(values, setValues, mode)}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button fullWidth={isMobile} variant="contained" onClick={save}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        fullWidth
        maxWidth="xs"
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
            Eliminar registro
          </Typography>
          <IconButton
            aria-label="Cerrar"
            onClick={() => setPendingDelete(null)}
            edge="end"
            disabled={deleting}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: tokens.textOnLight, mt: 0.5 }}>
            ¿Seguro que quieres eliminar{' '}
            <Box component="strong" sx={{ color: tokens.textOnLight }}>
              {deleteLabel}
            </Box>
            ? Esta acción no se puede deshacer.
          </Typography>
          {baseEndpoint.includes('reservation') && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Al eliminar se libera el laboratorio en ese horario y cualquier equipo prestado
              asociado.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setPendingDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleting}
            startIcon={<DeleteIcon />}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
