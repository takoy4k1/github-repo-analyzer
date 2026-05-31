import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, user } = useAuth();
  const navigate = useNavigate();

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
