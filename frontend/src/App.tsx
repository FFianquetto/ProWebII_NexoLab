import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LaboratoriesPage from './pages/LaboratoriesPage';
import EquipmentPage from './pages/EquipmentPage';
import ReservationsPage from './pages/ReservationsPage';
import ReservationEquipmentPage from './pages/ReservationEquipmentPage';
import IncidentsPage from './pages/IncidentsPage';
import UsersPage from './pages/UsersPage';
import { appRoutes, publicRoutes } from './constants/routes';
import { canAccessRoute, homeForRole } from './constants/permissions';
import type { Role } from './types';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  if (!ready) return null;
  if (!token) return <Navigate to={publicRoutes.login} replace />;
  return children;
}

function RoleRoute({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) {
    return <Navigate to={homeForRole(user?.role)} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <DashboardPage />;
  return <Navigate to={homeForRole(user?.role)} replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path={publicRoutes.login} element={<LoginPage />} />
      <Route path={publicRoutes.register} element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="laboratories" element={<LaboratoriesPage />} />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route
          path="reservation-equipment"
          element={
            <RoleRoute allow={['TEACHER', 'STUDENT']}>
              <ReservationEquipmentPage />
            </RoleRoute>
          }
        />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route
          path="users"
          element={
            <RoleRoute allow={['ADMIN']}>
              <UsersPage />
            </RoleRoute>
          }
        />
        <Route path="reports" element={<Navigate to={appRoutes.panel} replace />} />
      </Route>
      <Route
        path="*"
        element={
          <Navigate
            to={canAccessRoute(user?.role, appRoutes.panel) ? appRoutes.panel : homeForRole(user?.role)}
            replace
          />
        }
      />
    </Routes>
  );
}
