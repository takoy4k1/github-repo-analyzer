import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = () => {
      const token = searchParams.get('token');
      if (token) {
        localStorage.setItem('repomind_token', token);
        // Force reload page to initialize AuthContext and fetch user profile
        window.location.href = '/dashboard';
      } else {
        navigate('/auth');
      }
    };
    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="w-10 h-10 text-accent animate-spin" />
      <p className="text-sm text-slate-500 font-mono">Completing GitHub sign in...</p>
    </div>
  );
};

export default AuthCallback;
