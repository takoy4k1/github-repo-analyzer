import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, BrainCircuit, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('repomind_theme', next);
    window.dispatchEvent(new Event('theme-change'));
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 group">
          <BrainCircuit className="w-5 h-5 text-accent" />
          <span className="text-sm font-bold text-text tracking-tight">
            repomind <span className="text-slate-500 font-normal">/</span> explainer
          </span>
        </Link>

        {/* Navigation / Actions */}
        <nav className="flex items-center space-x-3">
          {/* Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors border border-border bg-background cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-accent-orange" />
            ) : (
              <Moon className="w-4 h-4 text-accent" />
            )}
          </button>

          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-text hover:bg-slate-200 dark:hover:bg-slate-800 border border-border bg-background transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              
              <div className="h-4 w-px bg-border" />

              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                user: <span className="text-text font-bold">{user.username}</span>
              </span>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-accent-red hover:bg-rose-500/10 transition-all border border-border bg-background cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-glow-violet text-xs py-1.5 px-4">
              Get Started
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
