import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const ERROR_MESSAGES = {
  not_configured: 'GitHub OAuth is not configured on this server. Please check server environment variables.',
  access_denied: 'GitHub authorization was denied or cancelled.',
  no_code: 'GitHub did not return an authorization code.',
  missing_state: 'OAuth verification failed: missing security state parameter.',
  invalid_state: 'OAuth verification failed: invalid security state. Please try again.',
  server_error: 'A server error occurred during GitHub authorization. Please try again.'
};

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser, user } = useAuth();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const executedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const xchg = params.get('xchg');
    const githubError = params.get('github_error') || params.get('error');

    if (githubError) {
      const msg = ERROR_MESSAGES[githubError] || `GitHub authorization failed: ${githubError}`;
      setStatus('error');
      setErrorMessage(msg);
      toast.error(msg);
      const timer = setTimeout(() => {
        navigate(user ? '/dashboard' : '/auth', { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (!xchg) {
      setStatus('error');
      setErrorMessage('Missing exchange authorization code.');
      const timer = setTimeout(() => {
        navigate(user ? '/dashboard' : '/auth', { replace: true });
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (executedRef.current) return;
    executedRef.current = true;

    // Exchange the one-time code for session / connection confirmation
    const exchangeCode = async () => {
      try {
        const response = await api.post('/auth/github/exchange', { xchg });
        const data = response.data;

        if (data.token) {
          // New login / registration flow
          localStorage.setItem('repomind_token', data.token);
          await refreshUser();
          setStatus('success');
          toast.success('Successfully authenticated with GitHub!');
          navigate('/dashboard', { replace: true });
        } else if (data.connected) {
          // Connected to existing account
          await refreshUser();
          setStatus('success');
          toast.success('GitHub account connected! You can now analyze your private repositories.');
          navigate('/dashboard', { replace: true });
        } else {
          setStatus('error');
          setErrorMessage('Unexpected response during OAuth exchange.');
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Exchange error:', err);
        const msg = err.response?.data?.message || 'Failed to complete GitHub authorization.';
        setStatus('error');
        setErrorMessage(msg);
        toast.error(msg);
        setTimeout(() => {
          navigate(user ? '/dashboard' : '/auth', { replace: true });
        }, 3000);
      }
    };

    exchangeCode();
  }, [location.search, navigate, refreshUser, user]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="glass-panel p-8 max-w-md w-full text-center space-y-4">
        {status === 'processing' && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-10 h-10 text-brand-violet animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Connecting GitHub</h2>
            <p className="text-xs text-slate-500 font-mono">
              Securely exchanging authorization code and verifying credentials...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Connected!</h2>
            <p className="text-xs text-slate-500 font-mono">Redirecting to workbench...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center text-rose-500">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Authorization Failed</h2>
            <p className="text-xs text-rose-400 font-mono">{errorMessage}</p>
            <p className="text-xs text-slate-500 font-mono pt-2">Returning shortly...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
