import { useCallback, useEffect, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { DRAWER_WIDTH } from '../theme/tokens';

/** Menú lateral: abrir con hamburguesa, cerrar solo con la X interior. */
export function useNavDrawer() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= theme.breakpoints.values.md;
  });

  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  return {
    open,
    toggle,
    close,
    isMobile,
    drawerWidth: DRAWER_WIDTH,
    isPermanent: !isMobile && open,
  };
}
