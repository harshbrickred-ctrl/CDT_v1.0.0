import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import LeavePage from './pages/LeavePage';
import TimesheetsPage from './pages/TimesheetsPage';
import DeliveryReviewsPage from './pages/DeliveryReviewsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ClientsPage from './pages/ClientsPage';
import SettingsUsersPage from './pages/SettingsUsersPage';
import SettingsLookupsPage from './pages/SettingsLookupsPage';
import SettingsAuditPage from './pages/SettingsAuditPage';
import SettingsImportPage from './pages/SettingsImportPage';
import InvoicesPage from './pages/InvoicesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectCandidateToEmployee() {
  const { id } = useParams();
  return <Navigate to={`/employees/${id}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/employees" element={<CandidatesPage />} />
        <Route path="/employees/:id" element={<CandidateDetailPage />} />
        <Route
          path="/candidates"
          element={<Navigate to="/employees" replace />}
        />
        <Route
          path="/candidates/:id"
          element={<RedirectCandidateToEmployee />}
        />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/leaves" element={<Navigate to="/leave" replace />} />
        <Route path="/timesheets" element={<TimesheetsPage />} />
        <Route path="/delivery-reviews" element={<DeliveryReviewsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/settings/users" element={<SettingsUsersPage />} />
        <Route path="/settings/lookups" element={<SettingsLookupsPage />} />
        <Route path="/settings/audit" element={<SettingsAuditPage />} />
        <Route path="/settings/import" element={<SettingsImportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
