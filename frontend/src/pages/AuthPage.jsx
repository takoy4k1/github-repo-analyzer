import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';

const GitHubIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, loginWithGitHub, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for OAuth error query param on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ghErr = params.get('github_error') || params.get('error');
    if (ghErr) {
      if (ghErr === 'access_denied') {
        setErrorMessage('GitHub authorization was cancelled.');
      } else if (ghErr === 'not_configured') {
        setErrorMessage('GitHub OAuth is not configured on the server.');
      } else {
        setErrorMessage(`GitHub login error: ${ghErr}`);
      }
    }
  }, [location.search]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    if (isLogin) {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setErrorMessage(result.message);
      }
    } else {
      if (!username.trim()) {
        setErrorMessage('Username is required');
        setLoading(false);
        return;
      }
      const result = await register(username, email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setErrorMessage(result.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 overflow-hidden">
      {/* Background Glow */}
      <div className="bg-radial-glow bg-brand-violet/10 w-[400px] h-[400px] absolute pointer-events-none z-0" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="w-full max-w-md glass-panel p-8 relative z-10"
      >
        {/* Header Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-tr from-brand-indigo to-brand-violet rounded-2xl shadow-neon-violet/20 mb-3">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-wide text-text">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isLogin ? 'Access your RepoMind workbench' : 'Get started parsing codebases with AI'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-300 text-xs rounded-xl flex items-center space-x-2 animate-pulse">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username (Only Sign Up) */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="john_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input text-sm"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input text-sm"
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input text-sm"
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 font-semibold text-sm rounded-xl text-white transition-all duration-300 mt-4 flex items-center justify-center space-x-2 cursor-pointer ${
              loading 
                ? 'bg-brand-indigo/50 cursor-not-allowed' 
                : 'bg-gradient-to-r from-brand-indigo to-brand-violet hover:brightness-110 active:scale-95 shadow-neon-violet'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
                <Sparkles className="w-4 h-4 text-brand-cyan" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-panel px-3 text-[11px] text-slate-500 font-mono uppercase tracking-wider absolute">
              or
            </span>
          </div>

          {/* GitHub Auth Button */}
          <button
            type="button"
            onClick={loginWithGitHub}
            className="w-full py-3 px-4 font-semibold text-xs rounded-xl border border-border bg-background hover:bg-slate-200 dark:hover:bg-slate-800 text-text transition-all duration-200 flex items-center justify-center space-x-2.5 cursor-pointer shadow-sm hover:border-slate-400"
          >
            <GitHubIcon className="w-4 h-4 text-text" />
            <span>Continue with GitHub</span>
          </button>
        </form>
        {/* Toggle Switch */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMessage('');
            }}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-text transition-all font-medium decoration-brand-cyan hover:underline underline-offset-4 cursor-pointer"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
          </button>
        </div>


      </motion.div>
    </div>
  );
};

export default AuthPage;
