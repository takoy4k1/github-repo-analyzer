import { useState } from 'react';
import { Trash2, AlertCircle, File, User, Calendar, Settings, Check } from 'lucide-react';
import api from '../services/api';

const DeadCodeDetector = ({ repoId, initialStaleFiles, initialThreshold, onThresholdUpdated }) => {
  const [threshold, setThreshold] = useState(initialThreshold || 90);
  const [updating, setUpdating] = useState(false);

  const staleFiles = (initialStaleFiles || []).filter(file => file.daysStale > threshold);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSaveThreshold = async () => {
    setUpdating(true);
    try {
      // Save settings to user profile
      await api.put('/auth/settings', {
        settings: { stalenessThreshold: threshold }
      });
      if (onThresholdUpdated) {
        await onThresholdUpdated(threshold);
      }
    } catch (err) {
      console.error('Failed to update staleness threshold:', err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top threshold configurations panel */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-brand-violet">
            <Settings className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">Staleness Settings</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">Files untouched longer than selected threshold are flagged as stale.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              className="glass-input w-36 font-mono text-xs cursor-pointer bg-panel text-text"
            >
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
              <option value={180}>180 Days</option>
            </select>
          </div>

          <button
            onClick={handleSaveThreshold}
            disabled={updating}
            className="btn-glow-violet text-xs px-4 py-2.5 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>{updating ? 'Saving...' : 'Apply & Re-analyze'}</span>
          </button>
        </div>
      </div>

      {/* Stale files list */}
      <div className="glass-panel p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">Inactive Files Table</h3>
          <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5 font-sans">Files that have not been touched for more than {threshold} days. Deleting these could clean up the codebase.</p>
        </div>

        {staleFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border border-border rounded-2xl bg-slate-200/20 dark:bg-slate-950/40 text-center max-w-md mx-auto my-6 space-y-3">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Check className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">No stale files found</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans mt-0.5">
                All tracked files have recent activity within the selected threshold.
              </p>
            </div>
            <div className="text-[10px] text-slate-550 dark:text-slate-500 font-mono">
              Last analyzed: {new Date().toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">File Path</th>
                  <th className="pb-3 text-right">Size</th>
                  <th className="pb-3 text-right">Inactivity</th>
                  <th className="pb-3 pl-6">Primary Author</th>
                  <th className="pb-3 pl-4">Last Touched Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-slate-800 dark:text-slate-300">
                {staleFiles.map((file, idx) => (
                  <tr key={idx} className="hover:bg-slate-200/30 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 pl-2 max-w-xs truncate flex items-center space-x-2 text-slate-900 dark:text-white font-sans font-semibold">
                      <File className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate" title={file.file}>{file.file}</span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-brand-cyan">
                      {formatSize(file.sizeBytes)}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {file.daysStale} days
                    </td>
                    <td className="py-3 pl-6 font-sans">
                      <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-400">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{file.primaryAuthor || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-slate-600 dark:text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(file.lastTouchedDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeadCodeDetector;
