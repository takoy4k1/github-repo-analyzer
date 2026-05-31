import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import RepoAnalysisPage from './pages/RepoAnalysisPage';
import ComparisonTool from './pages/ComparisonTool';
import { Toaster } from 'react-hot-toast';

// Route protector for secure pages
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-slate-400 font-mono space-y-2">
        <div className="w-5 h-5 border-2 border-brand-violet border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Loading user profile...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background text-text flex flex-col">
          <Navbar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/compare" 
                element={
                  <ProtectedRoute>
                    <ComparisonTool />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/repo/:id" 
                element={
                  <ProtectedRoute>
                    <RepoAnalysisPage />
                  </ProtectedRoute>
                } 
              />
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              style: {
                background: 'var(--panel-color)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                borderRadius: '6px'
              }
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
