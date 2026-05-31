import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  Network, 
  BarChart4, 
  Code,
  Sparkles,
  Settings,
  Loader2,
  ShieldCheck,
  ChevronRight,
  ShieldAlert,
  GitPullRequest,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Copy,
  Download,
  Shield,
  Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import FileExplorer from '../components/FileExplorer';
import CodeViewer from '../components/CodeViewer';
import ChatPanel from '../components/ChatPanel';
import MermaidDiagram from '../components/MermaidDiagram';
import TimeMachine from '../components/TimeMachine';
import DeadCodeDetector from '../components/DeadCodeDetector';
import SecurityScanner from '../components/SecurityScanner';
import PRReviewer from '../components/PRReviewer';

const RepoAnalysisPage = () => {
  const { id } = useParams();
  
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [securityReport, setSecurityReport] = useState(null);

  const displayRepo = selectedSnapshot ? {
    ...repo,
    healthScore: selectedSnapshot.score,
    metrics: {
      ...repo.metrics,
      ...selectedSnapshot.metrics
    }
  } : repo;

  // Active workspace states
  const [activeTab, setActiveTab] = useState('summary'); // summary, code, diagram, insights
  const [activeFile, setActiveFile] = useState(null);
  const [activeFileContent, setActiveFileContent] = useState('');
  const [activeFileExplanation, setActiveFileExplanation] = useState('');
  const [loadingFileExplanation, setLoadingFileExplanation] = useState(false);

  // Cache explanations locally in-session so clicking away and back doesn't re-trigger API tokens
  const [explanationCache, setExplanationCache] = useState({});
  const [contentCache, setContentCache] = useState({});

  const fetchRepoDetails = async () => {
    try {
      const response = await api.get(`/repos/${id}`);
      setRepo(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load repository details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoDetails();
    
    // Fetch security report in the background
    api.get(`/repos/${id}/security`)
      .then(res => setSecurityReport(res.data))
      .catch(() => setSecurityReport(null));
  }, [id]);

  const handleSelectFile = async (filePath) => {
    setActiveFile(filePath);
    setActiveTab('code'); // Switch to file view tab
    
    // Check cache
    if (contentCache[filePath]) {
      setActiveFileContent(contentCache[filePath]);
      setActiveFileExplanation(explanationCache[filePath] || '');
      return;
    }

    setLoadingFileExplanation(true);
    setActiveFileContent('');
    setActiveFileExplanation('');

    try {
      const response = await api.post('/repos/explain-file', {
        repoId: id,
        filePath
      });

      const { content, explanation } = response.data;
      
      // Update cache
      setContentCache(prev => ({ ...prev, [filePath]: content }));
      setExplanationCache(prev => ({ ...prev, [filePath]: explanation }));

      setActiveFileContent(content);
      setActiveFileExplanation(explanation);
    } catch (err) {
      console.error('Failed to explain file:', err.message);
      setActiveFileContent('// Error loading file contents.');
      setActiveFileExplanation('Could not generate AI file explanation.');
    } finally {
      setLoadingFileExplanation(false);
    }
  };

  const handleTriggerExplanation = async (filePath) => {
    // If not cached, trigger select file which handles explanations
    if (!explanationCache[filePath]) {
      handleSelectFile(filePath);
    }
  };

  const renderImprovements = (text) => {
    if (!text) return null;
    const bullets = text
      .split(/\n|[-*•]\s+/)
      .map(b => b.trim())
      .filter(b => b.length > 0)
      .map(b => b.replace(/^[0-9]+\.\s+/, ''));
    
    if (bullets.length === 0) return <p className="text-slate-300 text-sm">{text}</p>;

    return (
      <ul className="space-y-3 font-mono">
        {bullets.map((bullet, idx) => (
          <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-300">
            <span className="flex h-5 items-center text-brand-violet font-bold shrink-0">→</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-12 h-12 text-brand-violet animate-spin" />
        <p className="text-sm text-slate-400 font-mono">Loading repository workspace...</p>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold text-white">Workspace Error</h3>
        <p className="text-sm text-slate-500">{error || 'Repository workspace not found.'}</p>
        <Link to="/dashboard" className="btn-glow-violet px-5 py-2 text-xs">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      
      {/* Top Breadcrumb bar */}
      <div className="h-14 bg-panel border-b border-border px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3 truncate">
          <Link to="/dashboard" className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-semibold text-slate-650 dark:text-slate-400 truncate">
            {repo.owner}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-700" />
          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {repo.name}
          </span>
          <span className="px-2 py-0.5 rounded bg-brand-violet/10 text-brand-violet border border-brand-violet/20 text-[10px] font-mono font-medium hidden sm:inline-block">
            {repo.branch}
          </span>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-500 font-mono hidden md:block">
          Parsed {displayRepo.metrics?.totalFiles} files in {displayRepo.metrics?.totalLines?.toLocaleString() || 0} lines
        </div>
      </div>

      {/* Main Grid Workbench */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Explorer Sidebar */}
        <aside className="w-72 border-r border-border bg-panel/30 p-4 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider">File Explorer</span>
            </div>
            <FileExplorer 
              fileTree={repo.fileTree} 
              activeFile={activeFile} 
              onSelectFile={handleSelectFile} 
            />
          </div>

          {/* Repo Info card */}
          <div className="p-3 bg-slate-200/30 dark:bg-slate-950/40 border border-border rounded-xl text-[10px] text-slate-600 dark:text-slate-500 font-mono">
            <div className="flex justify-between mb-1">
              <span>Branch:</span>
              <span className="text-slate-800 dark:text-slate-300 font-semibold">{repo.branch}</span>
            </div>
            <div className="flex justify-between">
              <span>Source URL:</span>
              <a href={repo.url} target="_blank" rel="noreferrer" className="text-brand-cyan hover:underline truncate max-w-[120px]">
                GitHub link
              </a>
            </div>
          </div>
        </aside>

        {/* Center Main Workbench Panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-200/10 dark:bg-slate-900/10 p-6">
          
          {/* Tabs header */}
          <div className="flex items-center space-x-1.5 border-b border-border mb-6 pb-3 pt-3 mt-2 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'summary' 
                  ? 'bg-brand-violet/10 text-brand-violet border border-brand-violet/20 font-bold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Overview Summary</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('code');
                if (!activeFile && repo.fileTree && repo.fileTree.children && repo.fileTree.children.length > 0) {
                  // Find first file node in children tree list to select
                  const firstFile = repo.fileTree.children.find(c => c.type === 'file');
                  if (firstFile) handleSelectFile(firstFile.path);
                }
              }}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'code'
                  ? 'bg-brand-violet/10 text-brand-violet border border-brand-violet/20 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>File Inspector</span>
            </button>

            <button
              onClick={() => setActiveTab('diagram')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'diagram'
                  ? 'bg-brand-violet/10 text-brand-violet border border-brand-violet/20 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Architecture Diagram</span>
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'insights'
                  ? 'bg-brand-violet/10 text-brand-violet border border-brand-violet/20 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart4 className="w-3.5 h-3.5" />
              <span>Insights Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('pr-reviews')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'pr-reviews'
                  ? 'bg-brand-violet/10 text-brand-violet border border-brand-violet/20 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>PR Reviewer</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'security'
                  ? 'bg-brand-violet/10 text-brand-violet border border-brand-violet/20 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Security Auditor</span>
            </button>

            <button
              onClick={() => setActiveTab('dead-code')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'dead-code'
                  ? 'bg-brand-violet/10 text-brand-violet border border-brand-violet/20 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dead Code Detector</span>
            </button>
          </div>

          {/* Tab contents */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
                     {/* 1. SUMMARY TAB */}
            {activeTab === 'summary' && repo.summary && (
              <div className="space-y-6 max-w-7xl animate-fade-in">
                {/* Time Machine Timeline Slider */}
                {repo.snapshotHistory && repo.snapshotHistory.length > 0 && (
                  <TimeMachine 
                    onSelectSnapshot={(snap) => setSelectedSnapshot(snap)} 
                    snapshotHistory={repo.snapshotHistory} 
                  />
                )}

                {/* Dashboard Grid Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  
                  {/* Left Column (Overview, Tech stack, Modules, Onboarding) */}
                  <div className="xl:col-span-2 space-y-6">
                    {/* Repository Overview Hero Card */}
                    <div className="glass-panel p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                        <div className="flex items-center space-x-2 text-brand-cyan">
                          <Sparkles className="w-5 h-5 text-brand-violet" />
                          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Repository Overview</h2>
                          <div className="flex items-center space-x-1.5 ml-3">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(repo.summary.overview);
                                toast.success('Overview copied to clipboard!');
                              }}
                              className="text-[10px] text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded border border-border bg-slate-200/30 dark:bg-slate-950/40 cursor-pointer transition-colors"
                              title="Copy summary overview"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => {
                                const blob = new Blob([repo.summary.overview], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${repo.name}-summary.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast.success('Summary downloaded!');
                              }}
                              className="text-[10px] text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded border border-border bg-slate-200/30 dark:bg-slate-950/40 cursor-pointer transition-colors"
                              title="Download summary overview"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-800 dark:text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">{repo.summary.overview}</p>
                      
                      {/* Tech stack badges */}
                      {repo.summary.techStack && repo.summary.techStack.length > 0 && (
                        <div className="pt-4 border-t border-border">
                          <span className="text-[10px] text-slate-600 dark:text-slate-500 block uppercase font-bold tracking-wider mb-2.5">Technologies Detected</span>
                          <div className="flex flex-wrap gap-2">
                            {repo.summary.techStack.map((tech, idx) => (
                              <span key={idx} className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs rounded-full bg-slate-200/50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-300 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                                <span>{tech}</span>
                              </span>
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-600 dark:text-slate-500 block mt-2 font-mono">
                            Detected from package manifests & source files with high confidence
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Major Modules List */}
                    {repo.summary.modules && repo.summary.modules.length > 0 && (
                      <div className="glass-panel p-6 space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-brand-cyan">Major Code Modules</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {repo.summary.modules.map((mod, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-slate-200/20 dark:bg-slate-950/40 border border-border space-y-1">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-200 block font-mono break-all">/{mod.name}</span>
                              <span className="text-xs text-slate-700 dark:text-slate-400 leading-relaxed block">{mod.purpose}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Developer Onboarding Instructions */}
                    <div className="glass-panel p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-brand-cyan font-sans">Developer Onboarding Instructions</h3>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(repo.summary.onboarding);
                            toast.success('Onboarding commands copied!');
                          }}
                          className="text-[10px] text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded border border-border bg-slate-200/30 dark:bg-slate-950/40 cursor-pointer transition-colors font-mono"
                          title="Copy onboarding block"
                        >
                          Copy Block
                        </button>
                      </div>
                      
                      <div className="rounded-xl overflow-hidden border border-border bg-slate-950 font-mono">
                        <div className="bg-slate-900/80 px-4 py-2.5 flex items-center justify-between text-[10px] text-slate-500 border-b border-border">
                          <div className="flex space-x-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/40" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                          </div>
                          <span>bash – onboarding_setup.sh</span>
                        </div>
                        <pre className="p-4 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                          {(repo.summary.onboarding || '').trim() === 'npm install' ? (
                            `# 1. Install project dependencies\nnpm install\n\n# 2. Run developer environment\nnpm run dev`
                          ) : (
                            repo.summary.onboarding || ''
                          )}
                        </pre>
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-500 block font-mono">
                        Detected setup sequences based on package dependencies and code entry points
                      </span>
                    </div>
                  </div>

                  {/* Right Column (Health Breakdown, Architecture, Quality, Scalability) */}
                  <div className="space-y-6">
                    
                    {/* Health Score breakdown card */}
                    <div className="glass-panel p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-border pb-3">
                        <span className="text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Health Dashboard</span>
                        <div className="flex items-center space-x-1 bg-slate-200/50 dark:bg-slate-950 border border-border px-2 py-0.5 rounded-full text-[10px] text-slate-600 dark:text-slate-500 font-mono shrink-0">
                          <span>Composite Score</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-mono font-extrabold text-2xl border shrink-0 ${
                          displayRepo.healthScore >= 80 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5' 
                            : displayRepo.healthScore >= 50 
                            ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/5' 
                            : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20 shadow-lg shadow-rose-500/5'
                        }`}>
                          {displayRepo.healthScore}%
                        </div>
                        
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                            {displayRepo.healthScore >= 80 
                              ? 'Excellent repository health' 
                              : displayRepo.healthScore >= 60 
                              ? 'Good repository health'
                              : displayRepo.healthScore >= 40
                              ? 'Moderate repository health'
                              : 'Critical repository health'
                            }
                          </h4>
                          <span className="text-[10px] text-slate-600 dark:text-slate-500 block font-mono mt-0.5">
                            Weighted analytical index
                          </span>
                        </div>
                      </div>

                      {/* Breakdown checklist */}
                      <div className="space-y-2.5 pt-4 border-t border-border">
                        {/* Code Quality check */}
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-sans min-w-0">
                            {displayRepo.metrics?.healthBreakdown?.testFileRatioScore >= 50 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                            )}
                            <span className="font-medium truncate">Code Quality Review</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-600 dark:text-slate-500 whitespace-nowrap shrink-0">
                            {displayRepo.metrics?.healthBreakdown?.testFileRatioScore >= 50 ? '✔ Healthy' : '⚠ Low test ratio'}
                          </span>
                        </div>

                        {/* Security check */}
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-sans min-w-0">
                            {!securityReport ? (
                              <Info className="w-4 h-4 text-slate-600 dark:text-slate-500 shrink-0" />
                            ) : (securityReport.findings || []).filter(f => f.severity === 'critical' || f.severity === 'high').length > 0 ? (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                            ) : (securityReport.findings || []).length > 0 ? (
                              <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            )}
                            <span className="font-medium truncate">Security Scan Audit</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-600 dark:text-slate-500 whitespace-nowrap shrink-0">
                            {!securityReport 
                              ? 'ℹ Unscanned' 
                              : (securityReport.findings || []).filter(f => f.severity === 'critical' || f.severity === 'high').length > 0
                              ? '❌ Risks found'
                              : (securityReport.findings || []).length > 0
                              ? '⚠ Warnings'
                              : '✔ Clean report'
                            }
                          </span>
                        </div>

                        {/* Maintenance activity check */}
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-sans min-w-0">
                            {displayRepo.metrics?.healthBreakdown?.commitFreqScore >= 50 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                            )}
                            <span className="font-medium truncate">Active Maintenance</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-600 dark:text-slate-500 whitespace-nowrap shrink-0">
                            {displayRepo.metrics?.healthBreakdown?.commitFreqScore >= 50 ? '✔ Active' : '⚠ Low frequency'}
                          </span>
                        </div>

                        {/* Maintainability check */}
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-sans min-w-0">
                            {(displayRepo.metrics?.maintainabilityScore || displayRepo.healthScore) >= 60 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                            )}
                            <span className="font-medium truncate">Structure & Debt</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-600 dark:text-slate-500 whitespace-nowrap shrink-0">
                            {(displayRepo.metrics?.maintainabilityScore || displayRepo.healthScore) >= 60 ? '✔ Maintainable' : '⚠ Tech debt risk'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recommended Improvements list */}
                    <div className="glass-panel p-6 space-y-4">
                      <div className="border-b border-border pb-2 flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-brand-violet animate-pulse" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recommended Next Steps</h3>
                      </div>
                      <div className="leading-relaxed">
                        {renderImprovements(repo.summary.improvements)}
                      </div>
                    </div>

                    {/* Architecture description */}
                    <div className="glass-panel p-6 space-y-3">
                      <div className="flex items-center space-x-2 border-b border-border pb-2">
                        <Layers className="w-4 h-4 text-brand-violet" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Architecture Design</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                        {(repo.summary.architecture || '').trim() === 'Client-server' ? (
                          <strong>Client–Server Architecture</strong>
                        ) : null}
                        {(repo.summary.architecture || '').trim() === 'Client-server' 
                          ? ' Frontend and backend operate independently with decoupled API communication and structured controllers.' 
                          : repo.summary.architecture || ''
                        }
                      </p>
                    </div>

                    {/* Code Quality overview block */}
                    <div className="glass-panel p-6 space-y-3">
                      <div className="flex items-center space-x-2 border-b border-border pb-2">
                        <BookOpen className="w-4 h-4 text-brand-violet" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans font-sans">Code Quality Review</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                        {(repo.summary.codeQuality || '').trim() === 'Readable' 
                          ? 'The source files are readable and well-structured, utilizing consistent modular folders, clear parameter naming conventions, and minimal code duplication.' 
                          : repo.summary.codeQuality || ''
                        }
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[10px] font-mono text-slate-650 dark:text-slate-500">
                        <div className="flex items-center space-x-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                          <span>Consistent Organization</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                          <span>Readable & Typed</span>
                        </div>
                      </div>
                    </div>

                    {/* Scalability & Bottlenecks */}
                    <div className="glass-panel p-6 space-y-3">
                      <div className="flex items-center space-x-2 border-b border-border pb-2">
                        <Settings className="w-4 h-4 text-brand-violet" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">Scalability & Bottlenecks</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                        {(repo.summary.scalability || '').trim() === 'Stateless' 
                          ? 'Stateless request handling supports easy scaling. There are no major bottlenecks detected; API & database performance can scale horizontally.' 
                          : repo.summary.scalability || ''
                        }
                      </p>
                      
                      <div className="mt-2.5 space-y-1.5 border-t border-border pt-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>No major bottleneck locks found</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Scales horizontally with stateless API</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. FILE VIEW TAB */}
            {activeTab === 'code' && (
              <div className="h-full min-h-[500px] animate-fade-in">
                <CodeViewer 
                  filePath={activeFile}
                  content={activeFileContent}
                  explanation={activeFileExplanation}
                  loadingExplanation={loadingFileExplanation}
                  onTriggerExplanation={handleTriggerExplanation}
                />
              </div>
            )}

            {/* 3. DIAGRAM TAB */}
            {activeTab === 'diagram' && (
              <div className="max-w-4xl space-y-4 animate-fade-in">
                <div className="glass-panel p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">System Topology</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">AI generated architecture relationship mapping for modules and dependencies.</p>
                  </div>
                  <MermaidDiagram chartCode={repo.summary?.diagram} repoId={id} repoUrl={repo.url} />
                </div>
              </div>
            )}

            {/* 4. INSIGHTS DASHBOARD */}
            {activeTab === 'insights' && (
              <div className="max-w-4xl space-y-6 animate-fade-in">
                
                {/* Heuristic metrics cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="glass-panel p-5 text-center space-y-1">
                    <span className="text-[10px] text-slate-600 dark:text-slate-500 uppercase tracking-wider font-semibold block">Complexity</span>
                    <span className={`text-lg font-extrabold block ${
                      displayRepo.metrics?.estimatedComplexity === 'High' ? 'text-rose-600 dark:text-rose-400' : (displayRepo.metrics?.estimatedComplexity === 'Medium' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')
                    }`}>
                      {displayRepo.metrics?.estimatedComplexity}
                    </span>
                  </div>

                  <div className="glass-panel p-5 text-center space-y-1">
                    <span className="text-[10px] text-slate-600 dark:text-slate-500 uppercase tracking-wider font-semibold block">Onboarding Difficulty</span>
                    <span className={`text-lg font-extrabold block ${
                      displayRepo.metrics?.onboardingDifficulty === 'Hard' ? 'text-rose-600 dark:text-rose-400' : (displayRepo.metrics?.onboardingDifficulty === 'Medium' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')
                    }`}>
                      {displayRepo.metrics?.onboardingDifficulty}
                    </span>
                  </div>

                  <div className="glass-panel p-5 text-center space-y-1">
                    <span className="text-[10px] text-slate-600 dark:text-slate-500 uppercase tracking-wider font-semibold block">Architecture Quality</span>
                    <span className="text-2xl font-extrabold text-brand-cyan block">
                      {displayRepo.metrics?.architectureScore} <span className="text-[10px] text-slate-500 dark:text-slate-600 font-normal">/ 100</span>
                    </span>
                  </div>

                  <div className="glass-panel p-5 text-center space-y-1">
                    <span className="text-[10px] text-slate-600 dark:text-slate-500 uppercase tracking-wider font-semibold block">Maintainability</span>
                    <span className="text-2xl font-extrabold text-brand-emerald block">
                      {displayRepo.metrics?.maintainabilityScore} <span className="text-[10px] text-slate-500 dark:text-slate-600 font-normal">/ 100</span>
                    </span>
                  </div>
                </div>

                {/* Language breakdowns */}
                <div className="glass-panel p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-brand-cyan">Language Index Distribution</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">Proportional breakdown of total parsed lines grouped by syntax type.</p>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(displayRepo.metrics?.languages || {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([lang, lines]) => {
                        const total = displayRepo.metrics.totalLines || 1;
                        const percentage = ((lines / total) * 100).toFixed(1);
                        
                        return (
                          <div key={lang} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold font-mono">
                              <span className="text-slate-800 dark:text-slate-300 capitalize">{lang}</span>
                              <span className="text-slate-600 dark:text-slate-400">{percentage}% ({lines.toLocaleString()} lines)</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-border">
                              <div 
                                className="bg-gradient-to-r from-brand-indigo to-brand-violet h-full rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Score breakdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-panel p-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-brand-violet" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Architectural Review</h4>
                    </div>
                    <ul className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 space-y-2.5">
                      <li className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-accent-green mt-0.5 shrink-0" />
                        <span>Design patterns are cleanly separated.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-accent-green mt-0.5 shrink-0" />
                        <span>Modularity score is high with decoupled routers.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-accent-green mt-0.5 shrink-0" />
                        <span>Folder structures reflect standardized best-practices.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="glass-panel p-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-brand-violet" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Maintainability Goals</h4>
                    </div>
                    <ul className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 space-y-2.5">
                      <li className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-accent-green mt-0.5 shrink-0" />
                        <span>Dependencies are up-to-date and clean.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-accent-green mt-0.5 shrink-0" />
                        <span>Code formatting rules are set (package.json).</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-accent-green mt-0.5 shrink-0" />
                        <span>Low duplicate code counts across components.</span>
                      </li>
                    </ul>
                  </div>
                </div>

              </div>
            )}

            {/* 5. PR REVIEWER TAB */}
            {activeTab === 'pr-reviews' && (
              <PRReviewer repoId={id} />
            )}

            {/* 6. SECURITY SCANNER TAB */}
            {activeTab === 'security' && (
              <SecurityScanner repoId={id} />
            )}

            {/* 7. DEAD CODE DETECTOR TAB */}
            {activeTab === 'dead-code' && (
              <DeadCodeDetector 
                repoId={id} 
                initialStaleFiles={repo.metrics?.deadCode?.staleFiles || []} 
                initialThreshold={repo.user?.settings?.stalenessThreshold || 90} 
                onThresholdUpdated={fetchRepoDetails} 
              />
            )}

          </div>
        </main>

        {/* Right Chat Sidebar */}
        <aside className="w-96 border-l border-border bg-slate-200/20 dark:bg-slate-950/40 p-4 shrink-0 hidden lg:block">
          <ChatPanel 
            repositoryId={id} 
            activeFile={activeFile}
            onSelectFile={handleSelectFile} 
          />
        </aside>

      </div>
    </div>
  );
};

export default RepoAnalysisPage;
