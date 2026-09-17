import type { ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import ScienceIcon from '@mui/icons-material/Science';
import DevicesIcon from '@mui/icons-material/Devices';
import EventIcon from '@mui/icons-material/EventAvailable';
import ReportIcon from '@mui/icons-material/ReportProblem';
import PeopleIcon from '@mui/icons-material/People';
import LinkIcon from '@mui/icons-material/Hub';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import { useNavDrawer } from '../hooks/useNavDrawer';
import { tokens } from '../theme/tokens';
import { appRoutes } from '../constants/routes';
import { RoleChip } from './StatusChip';
import { themedScrollbarCss } from './ThemedScrollbar';
import { routeRoles } from '../constants/permissions';
import type { Role } from '../types';

const navItems: Array<{
  to: string;
  label: string;
  icon: ReactNode;
  roles?: Role[];
  /** Si se define, oculta el ítem para esos roles. */
  hideFor?: Role[];
}> = [
  { to: appRoutes.panel, label: 'Panel', icon: <DashboardIcon />, roles: routeRoles[appRoutes.panel] },
  { to: appRoutes.laboratories, label: 'Laboratorios', icon: <ScienceIcon /> },
  { to: appRoutes.equipment, label: 'Inventario', icon: <DevicesIcon />, roles: ['ADMIN'] },
  { to: appRoutes.equipment, label: 'Equipos', icon: <DevicesIcon />, hideFor: ['ADMIN'] },
  { to: appRoutes.reservations, label: 'Reservas', icon: <EventIcon />, hideFor: ['ADMIN'] },
  {
    to: appRoutes.reservationEquipment,
    label: 'Equipos prestados',
    icon: <LinkIcon />,
    roles: routeRoles[appRoutes.reservationEquipment],
  },
  { to: appRoutes.incidents, label: 'Fallas', icon: <ReportIcon />, roles: ['ADMIN'] },
  { to: appRoutes.incidents, label: 'Reportar falla', icon: <ReportIcon />, hideFor: ['ADMIN'] },
  { to: appRoutes.users, label: 'Usuarios', icon: <PeopleIcon />, roles: routeRoles[appRoutes.users] },
];

const mobileTabs: Array<{ to: string; label: string; icon: ReactNode; roles?: Role[]; hideFor?: Role[] }> = [
  { to: appRoutes.panel, label: 'Panel', icon: <DashboardIcon />, roles: ['ADMIN'] },
  { to: appRoutes.reservations, label: 'Reservas', icon: <EventIcon />, hideFor: ['ADMIN'] },
  { to: appRoutes.laboratories, label: 'Lab.', icon: <ScienceIcon /> },
  { to: appRoutes.equipment, label: 'Inv.', icon: <DevicesIcon />, roles: ['ADMIN'] },
  { to: appRoutes.incidents, label: 'Fallas', icon: <ReportIcon />, roles: ['ADMIN'] },
  { to: appRoutes.incidents, label: 'Falla', icon: <ReportIcon />, hideFor: ['ADMIN'] },
  { to: appRoutes.users, label: 'Users', icon: <PeopleIcon />, roles: ['ADMIN'] },
];

const hideScrollbarSx = {
  overflowY: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 },
} as const;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { open, toggle, close, isMobile, drawerWidth, isPermanent } = useNavDrawer();

  const visibleNavItems = navItems.filter((item) => {
    if (item.hideFor && user?.role && item.hideFor.includes(user.role)) return false;
    if (!item.roles) return true;
    return Boolean(user?.role && item.roles.includes(user.role));
  });

  const visibleMobileTabs = mobileTabs.filter((item) => {
    if (item.hideFor && user?.role && item.hideFor.includes(user.role)) return false;
    if (!item.roles) return true;
    return Boolean(user?.role && item.roles.includes(user.role));
  });

  const mobileTabValue =
    visibleMobileTabs.find((t) => t.to === location.pathname)?.to ?? false;

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: { xs: 1.5, sm: 2 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h5"
            noWrap
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: tokens.primaryStrong,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
            }}
          >
            NexoLab
          </Typography>
          <Typography variant="body2" color={tokens.textOnDarkMuted} noWrap>
            Laboratorios conectados
          </Typography>
        </Box>
        <IconButton
          aria-label="Cerrar menú"
          onClick={close}
          size="small"
          sx={{
            flexShrink: 0,
            color: tokens.primaryStrong,
            bgcolor: 'rgba(31,168,122,0.14)',
            border: `1px solid rgba(124,255,178,0.28)`,
            borderRadius: '10px',
            width: 40,
            height: 40,
            '&:hover': { bgcolor: 'rgba(31,168,122,0.24)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: tokens.borderDark, flexShrink: 0 }} />

      <List sx={{ flex: 1, minHeight: 0, px: 1.25, py: 1.5, ...hideScrollbarSx }}>
        {visibleNavItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={RouterLink}
            to={item.to}
            selected={location.pathname === item.to}
            onClick={() => {
              if (isMobile) close();
            }}
            sx={{
              borderRadius: `${tokens.radiusInteractive}px`,
              mb: 0.5,
              color: tokens.textOnDarkMuted,
              '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 42 },
              '&.Mui-selected': {
                bgcolor: 'rgba(31, 168, 122, 0.16)',
                color: tokens.primaryStrong,
                '& .MuiListItemIcon-root': { color: tokens.primaryStrong },
              },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: { xs: '0.95rem', sm: '1.05rem' }, fontWeight: 600 }}
            />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ borderColor: tokens.borderDark, flexShrink: 0 }} />

      <Box sx={{ p: { xs: 1.5, sm: 2 }, flexShrink: 0, mt: 'auto' }}>
        <Typography variant="body2" fontWeight={700} noWrap color={tokens.textOnDark} mb={1.5}>
          {user?.fullName}
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Cerrar sesión
        </Button>
      </Box>
    </Box>
  );

  const drawerPaperSx = {
    width: drawerWidth,
    maxWidth: '100%',
    bgcolor: tokens.bgSidebar,
    backgroundImage: 'linear-gradient(180deg, rgba(31,168,122,0.08) 0%, transparent 28%), none',
    borderRight: `1px solid ${tokens.borderDark}`,
    color: tokens.textOnDark,
    boxShadow: 'none',
    borderRadius: 0,
    boxSizing: 'border-box' as const,
    height: '100dvh',
    maxHeight: '100dvh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100dvh',
        maxHeight: '100dvh',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          borderBottom: `1px solid ${tokens.borderDark}`,
          bgcolor: 'rgba(6,8,7,0.9)',
          backdropFilter: 'blur(12px)',
          color: tokens.textOnDark,
          width: { md: isPermanent ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { md: isPermanent ? `${drawerWidth}px` : 0 },
          transition: 'width 0.2s ease, margin 0.2s ease',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 58, sm: 66 }, gap: 1 }}>
          {!open && (
            <IconButton
              edge="start"
              onClick={toggle}
              aria-label="Abrir menú"
              sx={{ color: tokens.primaryStrong }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {isMobile ? 'NexoLab' : 'Gestión de laboratorios universitarios'}
            </Typography>
            {!isMobile && (
              <Typography variant="body2" color="text.secondary" noWrap>
                Reservas, inventario y reportes de fallas en un solo lugar
              </Typography>
            )}
          </Box>
          {user && (
            <Box sx={{ textAlign: 'right', minWidth: 0, maxWidth: { xs: 140, sm: 220 } }}>
              <Typography variant="body2" fontWeight={700} noWrap color={tokens.textOnDark}>
                {user.fullName}
              </Typography>
              <RoleChip role={user.role} sx={{ mt: 0.35 }} />
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: isPermanent ? drawerWidth : 0 },
          flexShrink: { md: 0 },
          transition: 'width 0.2s ease',
        }}
        aria-label="Menú principal"
      >
        <Drawer
          variant="temporary"
          open={open && !isPermanent}
          onClose={(_event, reason) => {
            if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
          }}
          ModalProps={{ keepMounted: true, disableEscapeKeyDown: true }}
          sx={{
            display: isPermanent ? 'none' : 'block',
            '& .MuiDrawer-paper': {
              ...drawerPaperSx,
              ...hideScrollbarSx,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          open={isPermanent}
          sx={{
            display: { xs: 'none', md: isPermanent ? 'block' : 'none' },
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              ...drawerPaperSx,
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: (theme) => theme.zIndex.drawer,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.75, sm: 2.5, md: 3 },
          pb: { xs: 11, md: 3 },
          width: { md: isPermanent ? `calc(100% - ${drawerWidth}px)` : '100%' },
          maxWidth: '100%',
          minWidth: 0,
          height: '100dvh',
          overflowX: 'hidden',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          transition: 'width 0.2s ease',
          ...themedScrollbarCss,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 58, sm: 66 } }} />
        <Outlet />
      </Box>

      {isMobile && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            borderRadius: 0,
            bgcolor: tokens.bgElevated,
            backgroundImage: 'none',
            border: 'none',
            borderTop: `1px solid ${tokens.borderDark}`,
            boxShadow: 'none',
            color: tokens.textOnDark,
          }}
        >
          <BottomNavigation
            showLabels
            value={mobileTabValue}
            onChange={(_e, value) => navigate(value)}
            sx={{ height: 68, bgcolor: 'transparent' }}
          >
            {visibleMobileTabs.map((tab) => (
              <BottomNavigationAction
                key={tab.to}
                label={tab.label}
                value={tab.to}
                icon={tab.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
