import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';

// Teacher pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import NotesPage from './pages/teacher/NotesPage';
import AbsencesPage from './pages/teacher/AbsencesPage';
import SupportsPage from './pages/teacher/SupportsPage';
import AnnoncesPage from './pages/teacher/AnnoncesPage';
import EmploiDuTempsPage from './pages/teacher/EmploiDuTempsPage';

// Agent pages
import AgentDashboard from './pages/agent/AgentDashboard';
import EnseignantsPage from './pages/agent/EnseignantsPage';
import AffectationsPage from './pages/agent/AffectationsPage';
import ReglesNotesPage from './pages/agent/ReglesNotesPage';
import PeriodesPage from './pages/agent/PeriodesPage';
import SupervisionPage from './pages/agent/SupervisionPage';
import EdtAgentPage from './pages/agent/EdtAgentPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Teacher routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={['Enseignant']}>
              <DashboardLayout role="enseignant" />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="notes"    element={<NotesPage />} />
          <Route path="absences" element={<AbsencesPage />} />
          <Route path="supports" element={<SupportsPage />} />
          <Route path="annonces" element={<AnnoncesPage />} />
          <Route path="emploi"   element={<EmploiDuTempsPage />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Agent routes */}
        <Route
          path="/agent"
          element={
            <ProtectedRoute allowedRoles={['Agent', 'Administrateur']}>
              <DashboardLayout role="agent" />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard"    element={<AgentDashboard />} />
          <Route path="enseignants"  element={<EnseignantsPage />} />
          <Route path="affectations" element={<AffectationsPage />} />
          <Route path="regles"       element={<ReglesNotesPage />} />
          <Route path="periodes"     element={<PeriodesPage />} />
          <Route path="supervision"  element={<SupervisionPage />} />
          <Route path="emploi"       element={<EdtAgentPage />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
