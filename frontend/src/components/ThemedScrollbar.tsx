import { GlobalStyles } from '@mui/material';
import { tokens } from '../theme/tokens';

/** Estilos de scrollbar NexoLab: riel negro + thumb verde. */
export const themedScrollbarCss = {
  scrollbarWidth: 'thin' as const,
  scrollbarColor: `${tokens.primary} ${tokens.bg}`,
  '&::-webkit-scrollbar': {
    width: 10,
    height: 10,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: tokens.bg,
    borderRadius: 8,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: tokens.primary,
    borderRadius: 8,
    border: `2px solid ${tokens.bg}`,
    backgroundClip: 'padding-box',
    '&:hover': {
      backgroundColor: tokens.primaryStrong,
    },
  },
  '&::-webkit-scrollbar-corner': {
    backgroundColor: tokens.bg,
  },
};

/**
 * Aplica la estética de scroll (fondo negro + verde) a html/body
 * y a cualquier contenedor con overflow.
 */
export default function ThemedScrollbar() {
  return (
    <GlobalStyles
      styles={{
        'html, body, #root': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${tokens.primary} ${tokens.bg}`,
          overflowX: 'hidden',
        },
        'html::-webkit-scrollbar, body::-webkit-scrollbar, #root::-webkit-scrollbar': {
          width: 10,
          height: 10,
        },
        'html::-webkit-scrollbar-track, body::-webkit-scrollbar-track, #root::-webkit-scrollbar-track':
          {
            backgroundColor: tokens.bg,
          },
        'html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb, #root::-webkit-scrollbar-thumb':
          {
            backgroundColor: tokens.primary,
            borderRadius: 8,
            border: `2px solid ${tokens.bg}`,
            backgroundClip: 'padding-box',
          },
        'html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover, #root::-webkit-scrollbar-thumb:hover':
          {
            backgroundColor: tokens.primaryStrong,
          },
        'html::-webkit-scrollbar-corner, body::-webkit-scrollbar-corner, #root::-webkit-scrollbar-corner':
          {
            backgroundColor: tokens.bg,
          },
        // Contenedores con scroll (main, drawers, tablas, diálogos)
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${tokens.primary} ${tokens.bg}`,
        },
        '*::-webkit-scrollbar': {
          width: 10,
          height: 10,
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: tokens.bg,
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: tokens.primary,
          borderRadius: 8,
          border: `2px solid ${tokens.bg}`,
          backgroundClip: 'padding-box',
        },
        '*::-webkit-scrollbar-thumb:hover': {
          backgroundColor: tokens.primaryStrong,
        },
        '*::-webkit-scrollbar-corner': {
          backgroundColor: tokens.bg,
        },
        // Evita la barra horizontal verde/negra molesta
        'html, body, #root, .MuiDialog-container, .MuiDialog-paper': {
          overflowX: 'hidden',
        },
      }}
    />
  );
}
