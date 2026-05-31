import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertOctagon, Terminal, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const SecurityScanner = ({ repoId }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const fetchSecurityReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/repos/${repoId}/security`);
      setReport(response.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setReport(null); // No report yet
      } else {
        setError('Failed to fetch security report.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityReport();
  }, [repoId]);

  const handleRunScan = async () => {
    setScanning(true);
    setError('');
    const toastId = toast.loading('Running security audit scan...');
    try {
      const response = await api.post(`/repos/${repoId}/security`);
      setReport(response.data);
      toast.success('Security audit scan completed!', { id: toastId });
    } catch (err) {
      const msg = err.response?.data?.message || 'Security scan failed.';
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setScanning(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 uppercase">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700 uppercase">Low</span>;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical') return 'border-rose-500/30 bg-rose-950/20 dark:bg-rose-950/10';
    if (severity === 'high') return 'border-orange-500/20 bg-orange-950/10';
    if (severity === 'medium') return 'border-amber-500/20 bg-amber-950/10';
    return 'border-border bg-slate-200/20 dark:bg-slate-950/10';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-violet animate-spin" />
        <p className="text-xs text-slate-500 font-mono">Loading security vault...</p>
      </div>
    );
  }

  const findings = report?.findings || [];
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header with dynamic status */}
      {report ? (
        <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl border ${
              (criticalCount > 0 || highCount > 0)
                ? 'bg-rose-500/10 text-rose-655 dark:text-rose-400 border-rose-500/20'
                : mediumCount > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            }`}>
              {criticalCount > 0 || highCount > 0 ? (
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
                  Security Status:{' '}
                  {criticalCount > 0 || highCount > 0 
                    ? 'Risks Flagged' 
                    : mediumCount > 0 
                    ? 'Warnings' 
                    : 'Healthy'
                  }
                </h3>
                <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded ${
                  criticalCount > 0 || highCount > 0
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : mediumCount > 0
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}>
                  {criticalCount > 0 || highCount > 0 ? 'Action Required' : 'Passed'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-sans">
                {criticalCount > 0 || highCount > 0 
                  ? `${criticalCount + highCount} high-severity issues require immediate resolution.` 
                  : 'No exposed credentials or dependency vulnerabilities detected.'
                }
              </p>
              <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-1 font-mono">
                Last scanned: {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="btn-glow-violet text-xs px-5 py-2.5 flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
          >
            {scanning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            <span>{scanning ? 'Auditing Repository...' : 'Run Scan Again'}</span>
          </button>
        </div>
      ) : (
        <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-brand-violet/10 rounded-xl text-brand-violet">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">Security Auditor & Secrets Scanner</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-sans">Scans repository for API secrets, vulnerable dependencies (OSV.dev), and code injection risks.</p>
            </div>
          </div>

          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="btn-glow-violet text-xs px-5 py-2.5 flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
          >
            {scanning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
            <span>{scanning ? 'Auditing Repository...' : 'Run Security Scan'}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          Error: {error}
        </div>
      )}

      {!report && !scanning ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center space-y-4">
          <div className="p-4 bg-slate-200/30 dark:bg-slate-950/60 rounded-2xl border border-border text-slate-600 dark:text-slate-500">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-350">No security report generated</h3>
            <p className="text-xs text-slate-600 dark:text-slate-500 font-sans max-w-xs mx-auto">Run a security scan to crawl codebase chunks and resolve API secrets or dependency risks.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Findings Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className={`glass-panel p-4 text-center border ${criticalCount > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'border-border bg-slate-200/20 dark:bg-slate-950/20'}`}>
              <span className="text-[10px] text-slate-600 dark:text-slate-500 uppercase tracking-wider font-bold block">Critical</span>
              <span className={`text-2xl font-extrabold block mt-1 ${criticalCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-550'}`}>{criticalCount}</span>
            </div>
            <div className={`glass-panel p-4 text-center border ${highCount > 0 ? 'bg-orange-500/5 border-orange-500/20' : 'border-border bg-slate-200/20 dark:bg-slate-950/20'}`}>
              <span className="text-[10px] text-slate-600 dark:text-slate-500 uppercase tracking-wider font-bold block">High Risk</span>
              <span className={`text-2xl font-extrabold block mt-1 ${highCount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-550'}`}>{highCount}</span>
            </div>
            <div className={`glass-panel p-4 text-center border ${mediumCount > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'border-border bg-slate-200/20 dark:bg-slate-950/20'}`}>
              <span className="text-[10px] text-slate-600 dark:text-slate-500 uppercase tracking-wider font-bold block">Medium Risk</span>
              <span className={`text-2xl font-extrabold block mt-1 ${mediumCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-550'}`}>{mediumCount}</span>
            </div>
            <div className="glass-panel p-4 text-center border border-border bg-slate-200/20 dark:bg-slate-950/20">
              <span className="text-[10px] text-slate-600 dark:text-slate-500 uppercase tracking-wider font-bold block">Low Risk</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-400 block mt-1">{lowCount}</span>
            </div>
          </div>

          {/* Audit Logs / Findings */}
          <div className="glass-panel p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">Vulnerabilities & Alerts Log</h3>
              <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5 font-sans">List of detected credential risks, OSV advisory reports, and structural code violations.</p>
            </div>

            {findings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-border rounded-2xl bg-slate-200/20 dark:bg-slate-950/40 text-center max-w-md mx-auto my-6 space-y-4">
                <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">No security issues detected</h3>
                  <p className="text-xs text-slate-655 dark:text-slate-400 leading-relaxed font-sans mt-0.5">
                    Scanned repository items:
                  </p>
                  <ul className="text-xs text-slate-600 dark:text-slate-500 space-y-1 font-mono text-left inline-block mt-2">
                    <li className="flex items-center space-x-2">
                      <span className="text-emerald-600 dark:text-emerald-400">✔</span>
                      <span>API secrets</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-emerald-600 dark:text-emerald-400">✔</span>
                      <span>dependency vulnerabilities</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-emerald-600 dark:text-emerald-400">✔</span>
                      <span>unsafe patterns</span>
                    </li>
                  </ul>
                </div>
                <div className="px-3 py-1 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Repository looks secure.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {findings.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${getSeverityColor(item.severity)}`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2.5">
                        {getSeverityBadge(item.severity)}
                        <span className="text-xs font-mono font-bold text-brand-cyan">{item.type}</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-500 font-mono truncate max-w-[200px]" title={item.file}>({item.file})</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 leading-relaxed font-sans">{item.suggestion}</p>
                    </div>

                    <div className="flex items-center space-x-1.5 font-mono text-[10px] text-slate-600 dark:text-slate-500 shrink-0 self-end md:self-auto bg-slate-200/50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-border">
                      <Terminal className="w-3 h-3 text-brand-violet" />
                      <span>Status: Flagged</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SecurityScanner;
