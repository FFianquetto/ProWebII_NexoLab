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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ReportIcon from '@mui/icons-material/ReportProblem';
import PeopleIcon from '@mui/icons-material/People';
import LinkIcon from '@mui/icons-material/Hub';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import { useNavDrawer } from '../hooks/useNavDrawer';
import { tokens } from '../theme/tokens';
import { appRoutes } from '../constants/routes';
import { labelOf, roleLabels } from '../constants/labels';

const navItems = [
  { to: appRoutes.panel, label: 'Panel', icon: <DashboardIcon /> },
  { to: appRoutes.laboratories, label: 'Laboratorios', icon: <ScienceIcon /> },
  { to: appRoutes.equipment, label: 'Equipos', icon: <DevicesIcon /> },
  { to: appRoutes.reservations, label: 'Reservas', icon: <EventIcon /> },
  { to: appRoutes.reservationEquipment, label: 'Asignaciones', icon: <LinkIcon /> },
  { to: appRoutes.subjects, label: 'Materias', icon: <MenuBookIcon /> },
  { to: appRoutes.incidents, label: 'Incidencias', icon: <ReportIcon /> },
  { to: appRoutes.users, label: 'Usuarios', icon: <PeopleIcon /> },
  { to: appRoutes.reports, label: 'Reportes', icon: <AssessmentIcon /> },
];

const mobileTabs = [
  { to: appRoutes.panel, label: 'Panel', icon: <DashboardIcon /> },
  { to: appRoutes.reservations, label: 'Reservas', icon: <EventIcon /> },
  { to: appRoutes.laboratories, label: 'Lab.', icon: <ScienceIcon /> },
  { to: appRoutes.reports, label: 'Reportes', icon: <AssessmentIcon /> },
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

  const mobileTabValue =
    mobileTabs.find((t) => t.to === location.pathname)?.to ?? false;

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 2,
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

      <List sx={{ flex: 1, px: 1.25, py: 1.5, ...hideScrollbarSx }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={RouterLink}
            to={item.to}
            selected={location.pathname === item.to}
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
              primaryTypographyProps={{ fontSize: '1.05rem', fontWeight: 600 }}
            />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ borderColor: tokens.borderDark, flexShrink: 0 }} />

      <Box sx={{ p: 2, flexShrink: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap color={tokens.textOnDark}>
          {user?.fullName}
        </Typography>
        <Typography variant="caption" color={tokens.textOnDarkMuted} display="block" mb={1.25}>
          {labelOf(roleLabels, user?.role)}
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
    bgcolor: tokens.bgSidebar,
    backgroundImage: 'linear-gradient(180deg, rgba(31,168,122,0.08) 0%, transparent 28%), none',
    borderRight: `1px solid ${tokens.borderDark}`,
    color: tokens.textOnDark,
    boxShadow: 'none',
    borderRadius: 0,
    overflow: 'hidden',
    ...hideScrollbarSx,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        bgcolor: 'background.default',
        overflowX: 'hidden',
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
                Reservas, inventario e incidencias en un solo lugar
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: isPermanent ? drawerWidth : 0 },
          flexShrink: { md: 0 },
          transition: 'width 0.2s ease',
          overflow: 'hidden',
        }}
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
            '& .MuiDrawer-paper': drawerPaperSx,
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          open={isPermanent}
          sx={{
            display: { xs: 'none', md: isPermanent ? 'block' : 'none' },
            '& .MuiDrawer-paper': {
              ...drawerPaperSx,
              position: 'relative',
              height: '100dvh',
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
          overflowX: 'hidden',
          transition: 'width 0.2s ease',
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
            {mobileTabs.map((tab) => (
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
