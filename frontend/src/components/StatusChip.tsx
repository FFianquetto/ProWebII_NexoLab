import { Chip, type ChipProps, type SxProps, type Theme } from '@mui/material';
import {
  equipmentStatusLabels,
  incidentKindLabels,
  incidentStatusLabels,
  labelOf,
  labStatusLabels,
  reportTypeLabels,
  reservationStatusLabels,
  roleLabels,
  severityLabels,
} from '../constants/labels';

type Tone = { bg: string; fg: string };

/**
 * Paleta alineada a la leyenda de labs:
 * verde libre · ámbar juntando · rojo ocupado · gris no disponible
 */
const ROLE_TONES: Record<string, Tone> = {
  ADMIN: { bg: '#EA580C', fg: '#FFFFFF' },
  TEACHER: { bg: '#2563EB', fg: '#FFFFFF' },
  STUDENT: { bg: '#7C3AED', fg: '#FFFFFF' },
};

const REPORT_TYPE_TONES: Record<string, Tone> = {
  GENERAL: { bg: '#475569', fg: '#FFFFFF' },
  OCCUPANCY: { bg: '#0891B2', fg: '#FFFFFF' },
  INCIDENTS: { bg: '#D97706', fg: '#FFFFFF' },
  EQUIPMENT: { bg: '#059669', fg: '#FFFFFF' },
};

const RESERVATION_STATUS_TONES: Record<string, Tone> = {
  PENDING: { bg: '#D97706', fg: '#FFFFFF' },
  CONFIRMED: { bg: '#16A34A', fg: '#FFFFFF' },
  CANCELLED: { bg: '#DC2626', fg: '#FFFFFF' },
  COMPLETED: { bg: '#4F46E5', fg: '#FFFFFF' },
  NO_SHOW: { bg: '#9333EA', fg: '#FFFFFF' },
};

const LAB_STATUS_TONES: Record<string, Tone> = {
  AVAILABLE: { bg: '#16A34A', fg: '#FFFFFF' },
  MAINTENANCE: { bg: '#D97706', fg: '#FFFFFF' },
  CLOSED: { bg: '#64748B', fg: '#FFFFFF' },
};

const EQUIPMENT_STATUS_TONES: Record<string, Tone> = {
  AVAILABLE: { bg: '#16A34A', fg: '#FFFFFF' },
  IN_USE: { bg: '#2563EB', fg: '#FFFFFF' },
  BROKEN: { bg: '#DC2626', fg: '#FFFFFF' },
  MAINTENANCE: { bg: '#D97706', fg: '#FFFFFF' },
};

const INCIDENT_STATUS_TONES: Record<string, Tone> = {
  OPEN: { bg: '#DC2626', fg: '#FFFFFF' },
  IN_PROGRESS: { bg: '#D97706', fg: '#FFFFFF' },
  RESOLVED: { bg: '#16A34A', fg: '#FFFFFF' },
  CLOSED: { bg: '#64748B', fg: '#FFFFFF' },
};

const INCIDENT_KIND_TONES: Record<string, Tone> = {
  LABORATORY: { bg: '#0D9488', fg: '#FFFFFF' },
  EQUIPMENT: { bg: '#2563EB', fg: '#FFFFFF' },
};

const SEVERITY_TONES: Record<string, Tone> = {
  LOW: { bg: '#0284C7', fg: '#FFFFFF' },
  MEDIUM: { bg: '#D97706', fg: '#FFFFFF' },
  HIGH: { bg: '#E11D48', fg: '#FFFFFF' },
  CRITICAL: { bg: '#7F1D1D', fg: '#FFFFFF' },
};

/** Demanda / ocupación — misma lectura visual que la leyenda */
const OCCUPANCY_TONES: Record<string, Tone> = {
  FREE: { bg: '#16A34A', fg: '#FFFFFF' },
  GATHERING: { bg: '#EA580C', fg: '#FFFFFF' },
  OCCUPIED: { bg: '#DC2626', fg: '#FFFFFF' },
  UNAVAILABLE: { bg: '#64748B', fg: '#FFFFFF' },
};

const FALLBACK: Tone = { bg: '#475569', fg: '#FFFFFF' };

function SolidChip({
  label,
  tone,
  size = 'small',
  sx,
  onClick,
}: {
  label: string;
  tone: Tone;
  size?: ChipProps['size'];
  sx?: SxProps<Theme>;
  onClick?: ChipProps['onClick'];
}) {
  return (
    <Chip
      size={size}
      label={label}
      variant="filled"
      onClick={onClick}
      clickable={Boolean(onClick)}
      sx={[
        {
          height: size === 'small' ? 30 : 36,
          fontWeight: 800,
          letterSpacing: 0.01,
          border: 'none',
          boxShadow: '0 1px 2px rgba(15,23,42,0.12)',
          fontSize: size === 'small' ? '0.8rem' : '0.9rem',
          bgcolor: `${tone.bg} !important`,
          color: `${tone.fg} !important`,
          '& .MuiChip-label': {
            px: 1.35,
            color: `${tone.fg} !important`,
            opacity: 1,
            fontSize: 'inherit',
            lineHeight: 1.3,
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}

export function RoleChip({
  role,
  size = 'small',
  sx,
  onClick,
}: {
  role?: string | null;
  size?: ChipProps['size'];
  sx?: SxProps<Theme>;
  onClick?: ChipProps['onClick'];
}) {
  if (!role) return null;
  return (
    <SolidChip
      label={labelOf(roleLabels, role)}
      tone={ROLE_TONES[role] || FALLBACK}
      size={size}
      sx={sx}
      onClick={onClick}
    />
  );
}

export function ReportTypeChip({
  type,
  size = 'small',
  sx,
}: {
  type?: string | null;
  size?: ChipProps['size'];
  sx?: SxProps<Theme>;
}) {
  if (!type) return null;
  return (
    <SolidChip
      label={reportTypeLabels[type] || type}
      tone={REPORT_TYPE_TONES[type] || FALLBACK}
      size={size}
      sx={sx}
    />
  );
}

export function ReservationStatusChip({
  status,
  size = 'small',
  sx,
}: {
  status?: string | null;
  size?: ChipProps['size'];
  sx?: SxProps<Theme>;
}) {
  if (!status) return null;
  return (
    <SolidChip
      label={labelOf(reservationStatusLabels, status)}
      tone={RESERVATION_STATUS_TONES[status] || FALLBACK}
      size={size}
      sx={sx}
    />
  );
}

export function LabStatusChip({
  status,
  size = 'small',
}: {
  status?: string | null;
  size?: ChipProps['size'];
}) {
  if (!status) return null;
  return (
    <SolidChip
      label={labelOf(labStatusLabels, status)}
      tone={LAB_STATUS_TONES[status] || FALLBACK}
      size={size}
    />
  );
}

export function EquipmentStatusChip({
  status,
  size = 'small',
}: {
  status?: string | null;
  size?: ChipProps['size'];
}) {
  if (!status) return null;
  return (
    <SolidChip
      label={labelOf(equipmentStatusLabels, status)}
      tone={EQUIPMENT_STATUS_TONES[status] || FALLBACK}
      size={size}
    />
  );
}

export function IncidentStatusChip({
  status,
  size = 'small',
}: {
  status?: string | null;
  size?: ChipProps['size'];
}) {
  if (!status) return null;
  return (
    <SolidChip
      label={labelOf(incidentStatusLabels, status)}
      tone={INCIDENT_STATUS_TONES[status] || FALLBACK}
      size={size}
    />
  );
}

export function IncidentKindChip({
  kind,
  size = 'small',
}: {
  kind?: string | null;
  size?: ChipProps['size'];
}) {
  if (!kind) return null;
  return (
    <SolidChip
      label={labelOf(incidentKindLabels, kind)}
      tone={INCIDENT_KIND_TONES[kind] || FALLBACK}
      size={size}
    />
  );
}

export function SeverityChip({
  severity,
  size = 'small',
}: {
  severity?: string | null;
  size?: ChipProps['size'];
}) {
  if (!severity) return null;
  return (
    <SolidChip
      label={labelOf(severityLabels, severity)}
      tone={SEVERITY_TONES[severity] || FALLBACK}
      size={size}
    />
  );
}

export function OccupancyChip({
  occupancy,
  label,
  size = 'small',
}: {
  occupancy?: string | null;
  label?: string | null;
  size?: ChipProps['size'];
}) {
  if (!occupancy) return null;
  const tone = OCCUPANCY_TONES[occupancy] || FALLBACK;
  return <SolidChip label={label || occupancy} tone={tone} size={size} />;
}
