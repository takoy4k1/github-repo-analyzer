import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, BarChart2, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import api from '../services/api';

const ComparisonTool = () => {
  const [searchParams] = useSearchParams();
  const repoIds = searchParams.get('ids') || '';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchComparison = async () => {
    if (!repoIds) {
      setError('No repositories selected for comparison.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/repos/compare?ids=${repoIds}`);
      setData(response.data);
    } catch (err) {
      setError('Failed to fetch comparison details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [repoIds]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <RefreshCw className="w-10 h-10 text-brand-violet animate-spin" />
        <p className="text-sm text-slate-400 font-mono">Comparing repositories...</p>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Comparison Error</h3>
        <p className="text-sm text-slate-600 dark:text-slate-500">{error || 'Please select repositories to compare.'}</p>
        <Link to="/dashboard" className="btn-glow-violet px-5 py-2 text-xs">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Formulate Radar Chart data
  // Normalize each metric to a 0-100 scale for comparison in the Radar chart
  const metricsKeys = [
    { label: 'Health Score', key: 'healthScore' },
    { label: 'Files Count (x0.1)', key: 'totalFiles', factor: 0.1 },
    { label: 'Lines Count (x0.01)', key: 'totalLines', factor: 0.01 },
    { label: 'PR Velocity', key: 'averagePrMergeTimeHours', invert: true },
    { label: 'DNA Risk (Inverted)', key: 'busFactorRisksCount', invert: true },
    { label: 'Clean Code Index', key: 'staleFilesCount', invert: true }
  ];

  const radarData = metricsKeys.map(metric => {
    const item = { subject: metric.label };
    data.forEach(repo => {
      let rawVal = repo[metric.key] || 0;
      if (metric.factor) {
        rawVal = rawVal * metric.factor;
      }
      if (metric.invert) {
        // Higher velocity hours -> lower chart value (so better velocity/less risk is higher in radar)
        rawVal = Math.max(0, 100 - rawVal);
      }
      item[repo.name] = Math.min(100, Math.round(rawVal));
    });
    return item;
  });

  const radarColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  // Helper function to calculate differences/deltas relative to the first repository in list
  const renderDelta = (currentVal, referenceVal, isLowerBetter = false) => {
    if (referenceVal === undefined || referenceVal === currentVal) return null;
    const diff = currentVal - referenceVal;
    if (diff === 0) return null;

    const isGood = isLowerBetter ? diff < 0 : diff > 0;
    const sign = diff > 0 ? '+' : '';

    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ml-2 inline-flex items-center ${
        isGood ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
      }`}>
        {isGood ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
        {sign}{diff.toLocaleString()}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-10">
      {/* Header bar */}
      <div className="flex items-center space-x-3">
        <Link to="/dashboard" className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all border border-border">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Repository Comparison Dashboard</h1>
          <p className="text-sm text-slate-655 dark:text-slate-400 mt-1">Side-by-side technical analytics, delta calculations, and distribution metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Comparison Radar Chart */}
        <div className="lg:col-span-1 glass-panel p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-brand-violet" />
              <span>Comparative Radar Metrics</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">Visually overlays codebase scores, file quantities, contributor concentrations, and speeds.</p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-color)', fontSize: 9 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-color)', opacity: 0.6, fontSize: 9 }} />
                {data.map((repo, idx) => (
                  <Radar
                    key={repo.id}
                    name={repo.name}
                    dataKey={repo.name}
                    stroke={radarColors[idx % radarColors.length]}
                    fill={radarColors[idx % radarColors.length]}
                    fillOpacity={0.2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Matrix comparison Table */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-4 overflow-x-auto">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Metrics Comparison Grid</h3>
            <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">Absolute metric details side-by-side, with delta values comparing to first repo.</p>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-slate-600 dark:text-slate-500 font-bold uppercase tracking-wider">
                <th className="pb-4">Metric</th>
                {data.map((repo, idx) => (
                  <th key={repo.id} className="pb-4 pl-4" style={{ color: radarColors[idx % radarColors.length] }}>
                    {repo.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-slate-800 dark:text-slate-300">
              {/* Health Score */}
              <tr className="hover:bg-slate-200/20 dark:hover:bg-white/5 transition-colors">
                <td className="py-4 font-bold text-slate-900 dark:text-white uppercase tracking-wide">Health Score</td>
                {data.map((repo, idx) => (
                  <td key={repo.id} className="py-4 pl-4">
                    <span className={`text-base font-extrabold font-mono ${
                      repo.healthScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : repo.healthScore >= 50 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {repo.healthScore}%
                    </span>
                    {idx > 0 && renderDelta(repo.healthScore, data[0].healthScore)}
                  </td>
                ))}
              </tr>

              {/* Total Files */}
              <tr className="hover:bg-slate-200/20 dark:hover:bg-white/5 transition-colors">
                <td className="py-4">Total Files</td>
                {data.map((repo, idx) => (
                  <td key={repo.id} className="py-4 pl-4 font-mono font-bold">
                    {repo.totalFiles}
                    {idx > 0 && renderDelta(repo.totalFiles, data[0].totalFiles, true)}
                  </td>
                ))}
              </tr>

              {/* Total Lines */}
              <tr className="hover:bg-slate-200/20 dark:hover:bg-white/5 transition-colors">
                <td className="py-4">Total Lines</td>
                {data.map((repo, idx) => (
                  <td key={repo.id} className="py-4 pl-4 font-mono font-bold">
                    {repo.totalLines.toLocaleString()}
                    {idx > 0 && renderDelta(repo.totalLines, data[0].totalLines, true)}
                  </td>
                ))}
              </tr>

              {/* PR Velocity */}
              <tr className="hover:bg-slate-200/20 dark:hover:bg-white/5 transition-colors">
                <td className="py-4">Avg PR Merge Time</td>
                {data.map((repo, idx) => (
                  <td key={repo.id} className="py-4 pl-4 font-mono font-bold">
                    {repo.averagePrMergeTimeHours} Hours
                    {idx > 0 && renderDelta(repo.averagePrMergeTimeHours, data[0].averagePrMergeTimeHours, true)}
                  </td>
                ))}
              </tr>

              {/* Bus Factor count */}
              <tr className="hover:bg-slate-200/20 dark:hover:bg-white/5 transition-colors">
                <td className="py-4">High Risk Bus-Factor Files</td>
                {data.map((repo, idx) => (
                  <td key={repo.id} className="py-4 pl-4 font-mono font-bold">
                    {repo.busFactorRisksCount} files
                    {idx > 0 && renderDelta(repo.busFactorRisksCount, data[0].busFactorRisksCount, true)}
                  </td>
                ))}
              </tr>

              {/* Stale files count */}
              <tr className="hover:bg-slate-200/20 dark:hover:bg-white/5 transition-colors">
                <td className="py-4">Stale Code Files</td>
                {data.map((repo, idx) => (
                  <td key={repo.id} className="py-4 pl-4 font-mono font-bold">
                    {repo.staleFilesCount} files
                    {idx > 0 && renderDelta(repo.staleFilesCount, data[0].staleFilesCount, true)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComparisonTool;
