import { Stack, ThemeProvider, createTheme } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import { tokens } from '../theme/tokens';
import {
  BUSINESS_LAST_START_HOUR,
  BUSINESS_START_HOUR,
  isStartHourBlocked,
} from '../utils/reservationTime';

dayjs.locale('es');

const ink = '#0F172A';
const inkMuted = '#334155';

const lightPickerTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.primary, dark: tokens.primaryDeep, contrastText: '#F4FFF8' },
    text: { primary: ink, secondary: inkMuted },
    background: { paper: '#FFFFFF', default: '#FFFFFF' },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: ink,
          fontWeight: 600,
          '& input': { color: ink, WebkitTextFillColor: ink },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: inkMuted, fontWeight: 600 },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { marginTop: 4, marginLeft: 2 },
      },
    },
  },
});

const fieldSx = {
  width: '100%',
          '& .MuiFormHelperText-root': {
            color: `${inkMuted} !important`,
            fontWeight: 600,
          },
};

const paperSx = {
  bgcolor: '#FFFFFF',
  color: ink,
  borderRadius: 3,
  border: '1px solid rgba(15,23,42,0.12)',
  boxShadow: '0 16px 40px rgba(8,53,40,0.28)',
  '& .MuiPickersDay-root': {
    color: ink,
    fontWeight: 600,
    '&.Mui-selected': {
      bgcolor: `${tokens.primary} !important`,
      color: '#F4FFF8 !important',
    },
    '&.MuiPickersDay-today': { border: `2px solid ${tokens.primary}` },
  },
  '& .MuiMultiSectionDigitalClockSection-item': {
    color: ink,
    fontWeight: 600,
    '&.Mui-selected': {
      bgcolor: `${tokens.primary} !important`,
      color: '#F4FFF8 !important',
    },
    '&.Mui-disabled': {
      color: 'rgba(15,23,42,0.28) !important',
      textDecoration: 'line-through',
    },
  },
};

export type BusySlot = { id?: string; startsAt: string; endsAt: string };

type Props = {
  valueIso?: string | null;
  onChange: (iso: string) => void;
  minDateTime?: Dayjs;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  /** Reservas confirmadas del lab ese día (traslapes → hora inhabilitada) */
  busySlots?: BusySlot[];
};

function toHourSharp(d: Dayjs) {
  return d.minute(0).second(0).millisecond(0);
}

function mergeDateAndTime(base: Dayjs | null, datePart: Dayjs | null, timePart: Dayjs | null) {
  const current = base?.isValid() ? base : dayjs().add(1, 'hour').minute(0).second(0);
  let next = toHourSharp(current);
  if (datePart?.isValid()) {
    next = next.year(datePart.year()).month(datePart.month()).date(datePart.date());
  }
  if (timePart?.isValid()) {
    next = next.hour(timePart.hour());
  }
  return toHourSharp(next);
}

export default function ReservationDateTimeField({
  valueIso,
  onChange,
  minDateTime,
  error,
  helperText,
  disabled,
  busySlots = [],
}: Props) {
  const value = valueIso && dayjs(valueIso).isValid() ? toHourSharp(dayjs(valueIso)) : null;

  const emit = (next: Dayjs) => {
    onChange(toHourSharp(next).toDate().toISOString());
  };

  const hourIsBusy = (candidate: Dayjs) => {
    const start = toHourSharp(candidate);
    return isStartHourBlocked(start.toDate().toISOString(), busySlots);
  };

  const hourOutOfBusiness = (candidate: Dayjs) => {
    const h = toHourSharp(candidate).hour();
    return h < BUSINESS_START_HOUR || h > BUSINESS_LAST_START_HOUR;
  };

  const dayMinTime = (() => {
    const base = value || minDateTime || dayjs();
    let min = base.hour(BUSINESS_START_HOUR).minute(0).second(0).millisecond(0);
    if (minDateTime && base.isSame(minDateTime, 'day') && minDateTime.isAfter(min)) {
      min = toHourSharp(minDateTime);
    }
    return min;
  })();

  const dayMaxTime = (value || minDateTime || dayjs())
    .hour(BUSINESS_LAST_START_HOUR)
    .minute(0)
    .second(0)
    .millisecond(0);

  return (
    <ThemeProvider theme={lightPickerTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 0 }}>
          <DatePicker
            label="Fecha"
            value={value}
            disabled={disabled}
            minDate={minDateTime}
            format="DD/MM/YYYY"
            views={['year', 'month', 'day']}
            openTo="day"
            onChange={(datePart) => {
              if (!datePart?.isValid()) return;
              emit(mergeDateAndTime(value, datePart, value));
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                required: true,
                error,
                helperText: error && helperText ? helperText : undefined,
                sx: fieldSx,
              },
              popper: {
                placement: 'bottom-start',
                modifiers: [
                  { name: 'flip', enabled: true },
                  { name: 'preventOverflow', options: { padding: 8 } },
                  { name: 'offset', options: { offset: [0, 6] } },
                ],
                sx: { zIndex: 1700 },
              },
              desktopPaper: { sx: { ...paperSx, zIndex: 1700 } },
              actionBar: { actions: ['today', 'accept'] },
            }}
            localeText={{
              todayButtonLabel: 'Hoy',
              okButtonLabel: 'Listo',
              cancelButtonLabel: 'Cancelar',
            }}
          />

          <TimePicker
            label="Hora"
            value={value}
            disabled={disabled}
            minTime={dayMinTime}
            maxTime={dayMaxTime}
            ampm
            views={['hours']}
            view="hours"
            openTo="hours"
            format="hh:00 A"
            timeSteps={{ hours: 1, minutes: 60 }}
            shouldDisableTime={(timeValue, view) => {
              if (view !== 'hours') return false;
              const base = value || minDateTime || dayjs();
              const candidate = toHourSharp(
                base.hour(timeValue.hour()).minute(0).second(0).millisecond(0),
              );
              return hourOutOfBusiness(candidate) || hourIsBusy(candidate);
            }}
            onChange={(timePart) => {
              if (!timePart?.isValid()) return;
              const next = mergeDateAndTime(value, value, timePart);
              if (hourOutOfBusiness(next) || hourIsBusy(next)) return;
              emit(next);
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                required: true,
                error:
                  error ||
                  Boolean(value && (hourIsBusy(value) || hourOutOfBusiness(value))),
                helperText:
                  value && hourOutOfBusiness(value)
                    ? 'Horario permitido: 8:00 a.m. – 8:00 p.m.'
                    : value && hourIsBusy(value)
                      ? 'Esa hora ya está ocupada en este laboratorio'
                      : busySlots.length
                        ? 'Horas tachadas = ocupadas · 8:00 a.m.–8:00 p.m.'
                        : 'Solo 8:00 a.m. – 8:00 p.m. (fin máx. 10:00 p.m.)',
                sx: fieldSx,
              },
              popper: {
                placement: 'bottom-start',
                modifiers: [
                  { name: 'flip', enabled: true },
                  { name: 'preventOverflow', options: { padding: 8 } },
                  { name: 'offset', options: { offset: [0, 6] } },
                ],
                sx: { zIndex: 1700 },
              },
              desktopPaper: { sx: { ...paperSx, zIndex: 1700 } },
              actionBar: { actions: ['accept'] },
            }}
            localeText={{
              okButtonLabel: 'Listo',
              cancelButtonLabel: 'Cancelar',
            }}
          />
        </Stack>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
