import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

export { tokens } from './tokens';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: tokens.primary,
      light: tokens.primaryStrong,
      dark: tokens.primaryDeep,
      contrastText: '#04140E',
    },
    secondary: {
      main: tokens.secondary,
      contrastText: '#041018',
    },
    success: { main: '#3DDC97' },
    warning: { main: tokens.warning },
    error: { main: tokens.danger },
    info: { main: tokens.secondary },
    background: {
      default: tokens.bg,
      paper: tokens.surface,
    },
    divider: tokens.borderDark,
    text: {
      primary: tokens.textOnDark,
      secondary: tokens.textOnDarkMuted,
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Helvetica", "Arial", sans-serif',
    htmlFontSize: 16,
    fontSize: 16,
    body1: { fontSize: '1.0625rem', lineHeight: 1.55 },
    body2: { fontSize: '0.975rem', lineHeight: 1.5 },
    caption: { fontSize: '0.875rem', lineHeight: 1.4 },
    subtitle1: { fontSize: '1.125rem', fontWeight: 600 },
    subtitle2: { fontSize: '1rem', fontWeight: 600 },
    h1: { fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: '2.1rem' },
    h3: { fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: 'clamp(1.85rem, 3vw, 2.35rem)' },
    h4: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 700,
      fontSize: 'clamp(1.55rem, 2.8vw, 2rem)',
    },
    h5: { fontFamily: '"DM Sans", sans-serif', fontWeight: 650, fontSize: '1.35rem' },
    h6: { fontFamily: '"DM Sans", sans-serif', fontWeight: 650, fontSize: '1.2rem' },
    button: { textTransform: 'none', fontWeight: 600, fontSize: '1rem' },
  },
  shape: { borderRadius: tokens.radiusInfo },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.bg,
          backgroundImage:
            'radial-gradient(ellipse at top right, rgba(31,168,122,0.16), transparent 42%), radial-gradient(ellipse at bottom left, rgba(43,184,214,0.10), transparent 40%)',
          backgroundAttachment: 'fixed',
          fontSize: '16px',
        },
        // Quita el azul feo del autofill del navegador
        'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, textarea:-webkit-autofill, select:-webkit-autofill':
          {
            WebkitTextFillColor: `${tokens.textOnLight} !important`,
            caretColor: tokens.textOnLight,
            boxShadow: '0 0 0 1000px #FFFFFF inset !important',
            WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
            transition: 'background-color 99999s ease-out 0s',
          },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: tokens.radiusInteractive,
          minHeight: 44,
          px: 2.25,
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.primaryDeep} 100%)`,
          color: '#F4FFF8',
          '&:hover': { filter: 'brightness(1.08)' },
        },
        outlined: {
          borderColor: 'rgba(124,255,178,0.35)',
          color: tokens.primaryStrong,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { minWidth: 44, minHeight: 44, color: tokens.textOnDarkMuted },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: tokens.surface,
          color: tokens.textOnLight,
          border: `1px solid ${tokens.borderLight}`,
          borderRadius: tokens.radiusInfo,
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          color: tokens.textOnLight,
          border: `1px solid ${tokens.borderLight}`,
          borderRadius: tokens.radiusInfo,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: 12,
          borderRadius: tokens.radiusInfo,
          backgroundColor: tokens.surface,
          color: tokens.textOnLight,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: tokens.borderLight,
          color: tokens.textOnLight,
          fontSize: '0.975rem',
          py: 1.35,
        },
        head: {
          fontWeight: 700,
          fontSize: '0.9rem',
          backgroundColor: tokens.surfaceMuted,
          color: tokens.textOnLight,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radiusInteractive,
          boxShadow: '0 10px 28px rgba(31,168,122,0.35)',
        },
      },
    },
    MuiChip: {
      defaultProps: {
        variant: 'filled',
      },
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '0.82rem',
          borderRadius: tokens.radiusInteractive,
        },
        // Evita el gris claro por defecto de MUI sobre fondos blancos
        filled: {
          '&.MuiChip-colorDefault': {
            backgroundColor: tokens.primaryDeep,
            color: '#F2FBF6',
          },
        },
        outlined: {
          '&.MuiChip-colorDefault': {
            borderColor: tokens.primary,
            color: tokens.primaryDeep,
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.bgElevated,
          borderTop: `1px solid ${tokens.borderDark}`,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: tokens.textOnDarkMuted,
          '&.Mui-selected': { color: tokens.primaryStrong },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.8rem' },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          color: `${tokens.textOnLight} !important`,
          fontWeight: 600,
          opacity: 0.9,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            backgroundColor: '#fff',
            color: tokens.textOnLight,
            borderRadius: tokens.radiusInfo,
            fontSize: '1.0625rem',
          },
          '& .MuiInputLabel-root': {
            color: tokens.textOnLightMuted,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: tokens.radiusInteractive },
      },
    },
  },
});

export default theme;
