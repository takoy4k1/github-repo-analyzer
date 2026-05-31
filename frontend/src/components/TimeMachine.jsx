import { useState } from 'react';
import { Clock, AlertTriangle, TrendingUp } from 'lucide-react';

const TimeMachine = ({ snapshotHistory, onSelectSnapshot }) => {
  const [index, setIndex] = useState(snapshotHistory.length - 1);

  if (!snapshotHistory || snapshotHistory.length === 0) {
    return (
      <div className="glass-panel p-6 text-center text-slate-500 text-xs">
        No snapshots available for history scrub.
      </div>
    );
  }

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value, 10);
    setIndex(idx);
    onSelectSnapshot(snapshotHistory[idx]);
  };

  const selectedSnapshot = snapshotHistory[index];
  const dateStr = new Date(selectedSnapshot.timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate milestones
  const getMilestone = (idx) => {
    if (idx === 0) return 'Initial Baseline';
    if (idx === snapshotHistory.length - 1) return 'Current Status';
    
    // Check if score changed significantly
    const prev = snapshotHistory[idx - 1];
    const curr = snapshotHistory[idx];
    if (curr.score - prev.score > 5) return 'Health Improved';
    if (curr.score - prev.score < -5) return 'Vulnerabilities Introduced';
    
    return null;
  };

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-brand-violet" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Repository Time Machine</h3>
            <p className="text-[11px] text-slate-655 dark:text-slate-400 mt-0.5">Scrub the timeline to view historical health snapshots and milestones.</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-200/50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-border dark:border-white/5 font-mono text-xs">
          <span className="text-slate-600 dark:text-slate-500">Date:</span>
          <span className="text-slate-800 dark:text-slate-300 font-semibold">{dateStr}</span>
        </div>
      </div>

      {/* Slider Control */}
      <div className="space-y-3 pt-2">
        <input
          type="range"
          min="0"
          max={snapshotHistory.length - 1}
          value={index}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-violet focus:outline-none"
        />
        <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-500 font-mono">
          <span>{new Date(snapshotHistory[0].timestamp).toLocaleDateString()} (Start)</span>
          <span className="text-brand-cyan font-bold">Slide to travel in time</span>
          <span>{new Date(snapshotHistory[snapshotHistory.length - 1].timestamp).toLocaleDateString()} (Latest)</span>
        </div>
      </div>

      {/* Milestones / Events log along the timeline */}
      <div className="border-t border-border pt-4 space-y-3">
        <span className="text-[10px] text-slate-655 dark:text-slate-500 uppercase tracking-wider font-bold block mb-2">Timeline Highlights</span>
        <div className="flex flex-wrap gap-3">
          {snapshotHistory.map((snap, idx) => {
            const milestone = getMilestone(idx);
            if (!milestone) return null;
            
            const isCurrent = idx === index;

            return (
              <div
                key={idx}
                onClick={() => {
                  setIndex(idx);
                  onSelectSnapshot(snap);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 flex-1 min-w-[180px] ${
                  isCurrent
                    ? 'bg-brand-violet/15 dark:bg-brand-violet/20 border-brand-violet text-brand-violet font-bold'
                    : 'bg-slate-200/50 dark:bg-slate-950/40 border-border dark:border-white/5 text-slate-800 dark:text-slate-400 hover:border-slate-350 dark:hover:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono text-slate-600 dark:text-slate-500">
                    {new Date(snap.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`text-[10px] font-bold font-mono ${
                    snap.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : snap.score >= 50 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {snap.score}%
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {milestone.includes('Improved') ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : milestone.includes('Introduced') ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-brand-violet" />
                  )}
                  <span className="text-xs font-bold truncate">{milestone}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimeMachine;
