import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Clock, 
  FileCode, 
  TrendingUp, 
  Grid,
  AlertCircle,
  Loader2,
  Terminal,
  BarChart2
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const Dashboard = () => {
  const [repos, setRepos] = useState([]);
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [selectedRepos, setSelectedRepos] = useState([]);

  const fetchRepos = async () => {
    try {
      const response = await api.get('/repos');
      setRepos(response.data);
    } catch (err) {
      console.error('Error fetching repositories:', err.message);
    } finally {
      setListLoading(false);
    }
  };

  // Load repositories on mount
  useEffect(() => {
    fetchRepos();
  }, []);

  // Poll for incomplete repositories every 4 seconds
  useEffect(() => {
    const incompleteRepos = repos.some(r => 
      ['pending', 'cloning', 'parsing', 'indexing'].includes(r.status)
    );

    if (!incompleteRepos) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get('/repos');
        setRepos(response.data);
      } catch (err) {
        console.error('Error polling repositories:', err.message);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [repos]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!repoUrl.trim()) return;
    if (!repoUrl.includes('github.com')) {
      toast.error('Please enter a valid GitHub repository URL.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Submitting repository for analysis...');
    try {
      const response = await api.post('/repos/analyze', { url: repoUrl });
      setRepos(prev => [response.data, ...prev]);
      setRepoUrl('');
      toast.success('Repository analysis initiated!', { id: toastId });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit repository.';
      setSubmitError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();

    if (!window.confirm('Delete this repository analysis? All index and chat data will be lost.')) {
      return;
    }

    const toastId = toast.loading('Deleting repository analysis...');
    try {
      await api.delete(`/repos/${id}`);
      setRepos(prev => prev.filter(r => r._id !== id));
      toast.success('Repository analysis deleted.', { id: toastId });
    } catch (err) {
      toast.error('Failed to delete repository analysis.', { id: toastId });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700 animate-pulse">Pending</span>;
      case 'cloning':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse flex items-center space-x-1"><Loader2 className="w-3 h-3 animate-spin" /> <span>Cloning</span></span>;
      case 'parsing':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse flex items-center space-x-1"><Loader2 className="w-3 h-3 animate-spin" /> <span>Parsing</span></span>;
      case 'indexing':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse flex items-center space-x-1"><Loader2 className="w-3 h-3 animate-spin" /> <span>Indexing</span></span>;
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>;
      case 'failed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Failed</span>;
      default:
        return null;
    }
  };

  // Metrics summary calculations
  const totalIndexedLines = repos
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.metrics?.totalLines || 0), 0);

  const totalIndexedFiles = repos
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.metrics?.totalFiles || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Repository Hub</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-sans">Import GitHub repositories to generate explanations and initiate RAG discussions.</p>
        </div>

        {/* Form Input for Submission */}
        <form onSubmit={handleAnalyze} className="w-full md:max-w-md">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <GitBranch className="absolute left-3 top-3.5 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="https://github.com/username/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="glass-input pl-10 pr-4 py-3 text-sm shrink-0"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className="btn-glow-violet px-5 shrink-0 flex items-center space-x-1.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Import</span>
            </button>
          </div>
          {submitError && (
            <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{submitError}</span>
            </p>
          )}
        </form>
      </div>

      {/* Stats Board */}
      {repos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-panel p-6 flex items-center space-x-4">
            <div className="p-3 bg-brand-cyan/10 rounded-xl text-brand-cyan">
              <Grid className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-500 block uppercase tracking-wider font-semibold">Repositories</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{repos.length}</span>
            </div>
          </div>

          <div className="glass-panel p-6 flex items-center space-x-4">
            <div className="p-3 bg-brand-violet/10 rounded-xl text-brand-violet">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-500 block uppercase tracking-wider font-semibold">Indexed Files</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalIndexedFiles.toLocaleString()}</span>
            </div>
          </div>

          <div className="glass-panel p-6 flex items-center space-x-4">
            <div className="p-3 bg-brand-emerald/10 rounded-xl text-brand-emerald">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-500 block uppercase tracking-wider font-semibold">Total Code Lines</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalIndexedLines.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Repository Grid List */}
      {listLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 text-brand-violet animate-spin" />
          <p className="text-sm text-slate-500 font-mono">Fetching indexed repositories...</p>
        </div>
      ) : repos.length === 0 ? (
        <div className="glass-panel p-12 text-center max-w-xl mx-auto flex flex-col items-center space-y-4">
          <div className="p-4 bg-slate-200 dark:bg-slate-900 rounded-2xl text-slate-600 border border-border">
            <GitBranch className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-300 font-sans">No repositories indexed</h3>
            <p className="text-sm text-slate-600 dark:text-slate-500 font-sans">Paste your public GitHub repository link in the input field above to start exploring structure and details.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo) => {
            const isDone = repo.status === 'completed';
            const isProcessing = ['cloning', 'parsing', 'indexing'].includes(repo.status);
            
            return (
              <div 
                key={repo._id}
                className={`glass-panel p-6 flex flex-col justify-between min-h-[260px] transition-all duration-300 ${
                  isDone 
                    ? 'hover:border-slate-300 dark:hover:border-white/10 hover:shadow-glass-glow' 
                    : 'border-slate-200 dark:border-white/5 opacity-85'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      {isDone && (
                        <input
                          type="checkbox"
                          checked={selectedRepos.includes(repo._id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedRepos(prev => [...prev, repo._id]);
                            } else {
                              setSelectedRepos(prev => prev.filter(id => id !== repo._id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-750 bg-slate-200 dark:bg-slate-900 text-brand-violet focus:ring-brand-violet focus:ring-2 cursor-pointer"
                          title="Select for comparison"
                        />
                      )}
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-500 truncate max-w-[120px]">
                        {repo.owner}
                      </span>
                    </div>
                    {getStatusBadge(repo.status)}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate mb-1 font-sans">
                    {repo.name}
                  </h3>

                  {isDone && repo.healthScore !== undefined && (
                    <div className="flex items-center justify-between mt-2.5 mb-2 bg-slate-200/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-xl font-bold font-mono ${
                          repo.healthScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : repo.healthScore >= 50 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'
                        }`}>
                          {repo.healthScore}%
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          repo.healthScore >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : repo.healthScore >= 50 ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                        }`}>
                          Health
                        </span>
                      </div>
                      {repo.snapshotHistory && repo.snapshotHistory.length > 0 && (
                        <div className="h-6 w-20">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={repo.snapshotHistory}>
                              <Line 
                                type="monotone" 
                                dataKey="score" 
                                stroke={repo.healthScore >= 80 ? '#10b981' : repo.healthScore >= 50 ? '#f59e0b' : '#ef4444'} 
                                strokeWidth={1.5} 
                                dot={false} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Async Status Logs */}
                  {isProcessing && (
                    <div className="mt-3 flex items-center space-x-1.5 text-xs text-brand-cyan bg-slate-200/50 dark:bg-slate-950/60 p-2 rounded-lg font-mono border border-slate-200 dark:border-white/5">
                      <Terminal className="w-3.5 h-3.5 text-brand-violet animate-pulse" />
                      <span className="animate-pulse">Status: {repo.status}...</span>
                    </div>
                  )}

                  {repo.status === 'failed' && (
                    <p className="text-xs text-rose-500 dark:text-rose-400 mt-2 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 truncate" title={repo.error}>
                      Error: {repo.error || 'Check repository visibility'}
                    </p>
                  )}

                  {/* Repository Statistics */}
                  {isDone && repo.metrics && (
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-1">
                        <FileCode className="w-3.5 h-3.5 text-slate-500 dark:text-slate-650" />
                        <span>{repo.metrics.totalFiles} files</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-650" />
                        <span>{repo.metrics.totalLines?.toLocaleString() || 0} lines</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200 dark:border-white/5">
                  {isDone ? (
                    <Link 
                      to={`/repo/${repo._id}`}
                      className="flex items-center space-x-1 text-xs font-bold text-brand-cyan hover:text-brand-cyan/80 transition-colors"
                    >
                      <span>Open Workbench</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-600 italic">Processing...</span>
                  )}

                  <button
                    onClick={(e) => handleDelete(e, repo._id)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-200/50 dark:bg-slate-950 text-slate-600 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all"
                    title="Delete analysis record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Comparison Bar */}
      {selectedRepos.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 glass-panel p-4 flex items-center justify-between gap-6 shadow-2xl border-slate-200 dark:border-white/10 max-w-lg w-full">
          <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-brand-violet animate-pulse" />
            <span>{selectedRepos.length} repos selected for comparison</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRepos([])}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-200/50 dark:bg-slate-950 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <Link
              to={`/compare?ids=${selectedRepos.join(',')}`}
              className="btn-glow-violet text-xs px-4 py-1.5 flex items-center space-x-1"
            >
              <span>Compare Now</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
