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
import SubjectsPage from './pages/SubjectsPage';
import IncidentsPage from './pages/IncidentsPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import { appRoutes, publicRoutes } from './constants/routes';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to={publicRoutes.login} replace />;
  return children;
}

export default function App() {
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
        <Route index element={<DashboardPage />} />
        <Route path="laboratories" element={<LaboratoriesPage />} />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reservation-equipment" element={<ReservationEquipmentPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={appRoutes.panel} replace />} />
    </Routes>
  );
}
