import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreatePollPage from './pages/CreatePollPage';
import EditPollPage from './pages/EditPollPage';
import PollManagePage from './pages/PollManagePage';
import VotePage from './pages/VotePage';
import ResultsPage from './pages/ResultsPage';
import ExplorePage from './pages/ExplorePage';
import NotFoundPage from './pages/NotFoundPage';

// Layout
import AppLayout from './components/layout/AppLayout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-pm-dark flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-pm-red border-t-transparent rounded-full animate-spin" />
  </div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/vote/:slug" element={<VotePage />} />
      <Route path="/results/:slug" element={<ResultsPage />} />

      {/* Auth */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

      {/* Host Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="create" element={<CreatePollPage />} />
        <Route path="poll/:pollId/edit" element={<EditPollPage />} />
        <Route path="poll/:pollId/manage" element={<PollManagePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
