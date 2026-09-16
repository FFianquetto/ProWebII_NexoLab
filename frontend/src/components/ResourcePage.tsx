import { useEffect, useState, type ReactNode } from 'react';
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
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api/client';
import { tokens } from '../theme/tokens';
import InfoCard from './InfoCard';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  primary?: boolean;
}

interface ResourcePageProps<T extends { id: number }> {
  title: string;
  subtitle?: string;
  endpoint: string;
  columns: Column<T>[];
  renderForm: (values: Partial<T>, setValues: (v: Partial<T>) => void, mode: 'create' | 'edit') => ReactNode;
  emptyForm: Partial<T>;
  toPayload?: (values: Partial<T>, mode: 'create' | 'edit') => unknown;
}

function cellValue<T extends { id: number }>(row: T, col: Column<T>) {
  if (col.render) return col.render(row);
  return String((row as unknown as Record<string, unknown>)[col.key] ?? '');
}

export default function ResourcePage<T extends { id: number }>({
  title,
  subtitle,
  endpoint,
  columns,
  renderForm,
  emptyForm,
  toPayload,
}: ResourcePageProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [values, setValues] = useState<Partial<T>>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setError('');
      const { data } = await api.get(endpoint);
      setRows(data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'No se pudo cargar la información';
      setError(message);
    }
  };

  useEffect(() => {
    load();
  }, [endpoint]);

  const openCreate = () => {
    setMode('create');
    setValues(emptyForm);
    setEditingId(null);
    setOpen(true);
  };

  const openEdit = (row: T) => {
    setMode('edit');
    setValues(row);
    setEditingId(row.id);
    setOpen(true);
  };

  const save = async () => {
    try {
      setError('');
      const payload = toPayload ? toPayload(values, mode) : values;
      if (mode === 'create') {
        await api.post(endpoint, payload);
      } else if (editingId != null) {
        await api.put(`${endpoint}/${editingId}`, payload);
      }
      setOpen(false);
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'No se pudo guardar';
      setError(message);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      setError('');
      await api.delete(`${endpoint}/${id}`);
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'No se pudo eliminar';
      setError(message);
    }
  };

  const primaryCol = columns.find((c) => c.primary) || columns[0];
  const secondaryCols = columns.filter((c) => c.key !== primaryCol?.key);

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
        {!isMobile && (
          <Button 
            variant="contained" 
            disableElevation 
            startIcon={<AddIcon />} 
            onClick={openCreate}
          >
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
          {rows.map((row) => (
            <Card
              key={row.id}
              sx={{
                borderRadius: `${tokens.radiusInteractive}px`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:active': { transform: 'scale(0.98)' }, 
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
                      <Typography variant="caption" sx={{ color: tokens.textOnLightMuted }}>
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
              <CardActions sx={{ justifyContent: 'flex-end', px: 1.5, pb: 1.5, gap: 0.5 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => openEdit(row)}
                  sx={{ borderRadius: `${tokens.radiusInteractive}px` }}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  onClick={() => remove(row.id)}
                  sx={{ borderRadius: `${tokens.radiusInteractive}px` }}
                >
                  Eliminar
                </Button>
              </CardActions>
            </Card>
          ))}
          {rows.length === 0 && (
            <InfoCard sx={{ p: 3, textAlign: 'center', boxShadow: 'none' }}>
              <Typography variant="body2" sx={{ color: tokens.textOnLightMuted }}>
                No hay registros todavía.
              </Typography>
            </InfoCard>
          )}
        </Stack>
      ) : (
        <InfoCard sx={{ overflow: 'auto' }}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.label}</TableCell>
                ))}
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{cellValue(row, col)}</TableCell>
                  ))}
                  <TableCell align="right">
                    <IconButton aria-label="Editar" onClick={() => openEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="Eliminar" color="error" onClick={() => remove(row.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
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

      {isMobile && (
        <Fab
          color="primary"
          aria-label="Nuevo"
          onClick={openCreate}
          sx={{ position: 'fixed', bottom: 88, right: 24, zIndex: 1200 }} 
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
      >
        <DialogTitle>{mode === 'create' ? `Crear ${title}` : `Editar ${title}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {renderForm(values, setValues, mode)}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            fullWidth={isMobile} 
            variant="contained" 
            disableElevation 
            onClick={save}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}