import { useState, useEffect } from 'react';
import { GitPullRequest, Search, Send, AlertTriangle, AlertCircle, RefreshCw, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const PRReviewer = ({ repoId }) => {
  const [reviews, setReviews] = useState([]);
  const [prNumber, setPrNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeReviewId, setActiveReviewId] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/repos/${repoId}/pr-reviews`);
      setReviews(response.data);
      if (response.data.length > 0) {
        setActiveReviewId(response.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch PR reviews:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [repoId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setError('');
    const num = parseInt(prNumber, 10);
    if (isNaN(num)) {
      toast.error('Please enter a valid PR number.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(`Auditing Pull Request #${num}...`);
    try {
      const response = await api.post(`/repos/${repoId}/pr-reviews`, { prNumber: num });
      setReviews(prev => [response.data, ...prev]);
      setActiveReviewId(response.data._id);
      setPrNumber('');
      toast.success(`PR #${num} audited successfully!`, { id: toastId });
    } catch (err) {
      const msg = err.response?.data?.message || 'PR Review failed. Verify PR number exists.';
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase">Critical</span>;
      case 'warning':
        return <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">Warning</span>;
      case 'info':
        return <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase">Info</span>;
      default:
        return <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700 uppercase">{severity}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-violet animate-spin" />
        <p className="text-xs text-slate-500 font-mono">Loading PR Review Vault...</p>
      </div>
    );
  }

  const activeReview = reviews.find(r => r._id === activeReviewId);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
      {/* Left panel: Trigger new review & List of Reviews */}
      <div className="xl:col-span-1 space-y-6">
        {/* Form panel */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center space-x-2 text-brand-violet">
            <GitPullRequest className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Trigger PR Review</h3>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">Fetch any pull request diff from GitHub, run static check alerts, and request AI review analysis.</p>

          <form onSubmit={handleSubmitReview} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Pull Request Number (e.g. 1)"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                className="glass-input pl-10 pr-4 py-2.5 text-xs bg-background text-text"
                disabled={submitting}
              />
            </div>
            {error && (
              <p className="text-rose-605 text-[10px] mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || !prNumber.trim()}
              className="btn-glow-violet w-full py-2.5 text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{submitting ? 'Running Audit...' : 'Audit PR Code'}</span>
            </button>
          </form>
        </div>

        {/* Existing review list */}
        <div className="glass-panel p-5 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">PR Review History</h4>
            <p className="text-[10px] text-slate-600 dark:text-slate-500">Previously reviewed PRs for this workspace.</p>
          </div>

          {reviews.length === 0 ? (
            <p className="text-[11px] text-slate-600 dark:text-slate-500 italic">No PR audits performed yet.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {reviews.map((r) => (
                <div
                  key={r._id}
                  onClick={() => setActiveReviewId(r._id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                    activeReviewId === r._id
                      ? 'bg-brand-violet/10 border-brand-violet/30 text-brand-violet font-bold'
                      : 'bg-slate-200/20 dark:bg-slate-955/40 border-border text-slate-700 dark:text-slate-400 hover:border-slate-350 dark:hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <GitPullRequest className="w-3.5 h-3.5 text-brand-cyan" />
                    <span className="text-xs font-bold font-mono">PR #{r.prNumber}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Active Review details */}
      <div className="xl:col-span-2 space-y-6">
        {!activeReview ? (
          <div className="glass-panel p-12 text-center flex flex-col items-center justify-center space-y-4 h-full min-h-[300px]">
            <GitPullRequest className="w-10 h-10 text-slate-500 dark:text-slate-600" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-355">No PR Audit Selected</h3>
              <p className="text-xs text-slate-600 dark:text-slate-500">Select a previous audit from the list or insert a PR number above to trigger one.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* PR Summary markdown */}
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                  <GitPullRequest className="w-4 h-4 text-brand-cyan" />
                  <span>Pull Request #{activeReview.prNumber} Summary Review</span>
                </h3>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-500">
                  Reviewed: {new Date(activeReview.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="prose dark:prose-invert prose-xs max-w-none text-text text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                <ReactMarkdown>{activeReview.aiSummary}</ReactMarkdown>
              </div>
            </div>

            {/* Flagged issues */}
            <div className="glass-panel p-6 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Flagged Code Recommendations</h4>
                <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">Alert warnings generated directly from code diff logic scanning.</p>
              </div>

              {(!activeReview.flaggedIssues || activeReview.flaggedIssues.length === 0) ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-accent-green shrink-0" />
                  <span>No code quality or style issues flagged in this PR.</span>
                </p>
              ) : (
                <div className="space-y-3">
                  {activeReview.flaggedIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-200/20 dark:bg-slate-955/40 border border-border rounded-xl flex items-start space-x-3 text-xs text-slate-800 dark:text-slate-300"
                    >
                      <div className="mt-0.5 shrink-0">
                        {issue.severity === 'critical' ? (
                          <AlertTriangle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <AlertCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-slate-200">{issue.file}</span>
                          {getSeverityBadge(issue.severity)}
                          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-500 uppercase">({issue.type})</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-400 leading-relaxed font-sans">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PRReviewer;
