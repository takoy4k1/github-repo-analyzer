import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileCode, HelpCircle, Loader2, Sparkles, X } from 'lucide-react';

const CodeViewer = ({ filePath, content, explanation, loadingExplanation, onTriggerExplanation }) => {
  const [showExplanation, setShowExplanation] = useState(false);

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500 border border-dashed border-border rounded-2xl p-6 bg-slate-200/10 dark:bg-slate-950/20">
        <FileCode className="w-12 h-12 text-slate-500 mb-3" />
        <p className="text-sm">Select a file from the explorer sidebar to inspect code & request AI explanation.</p>
      </div>
    );
  }

  const lines = content ? content.split('\n') : [];

  const handleExplainClick = () => {
    setShowExplanation(true);
    if (!explanation && onTriggerExplanation) {
      onTriggerExplanation(filePath);
    }
  };

  return (
    <div className="flex h-full min-h-[500px] gap-4 relative">
      {/* Code window */}
      <div className={`flex-1 flex flex-col glass-panel overflow-hidden transition-all duration-300 ${showExplanation ? 'lg:max-w-[55%]' : 'w-full'}`}>
        
        {/* macOS style titlebar */}
        <div className="h-12 bg-slate-100 dark:bg-slate-950/80 border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* macOS color dots */}
            <div className="flex space-x-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 block" />
            </div>
            
            <div className="h-4 w-px bg-border" />

            {/* Path */}
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px] sm:max-w-md">
              {filePath}
            </span>
          </div>

          <button
            onClick={handleExplainClick}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              showExplanation 
                ? 'bg-brand-violet/20 text-brand-violet border border-brand-violet/30' 
                : 'bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-border'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
            <span>AI Explain</span>
          </button>
        </div>

        {/* Code Content Editor Area - styled consistently dark for syntax-like readability */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-200 border border-t-0 border-border">
          {lines.length === 0 ? (
            <div className="text-slate-600 italic">Empty file.</div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="w-10 pr-4 text-right text-slate-600 select-none border-r border-white/10 text-xs font-mono">
                      {idx + 1}
                    </td>
                    <td className="pl-4 text-left whitespace-pre text-slate-200 font-mono text-xs sm:text-sm">
                      {line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Slide-out AI Explanation Sidebar */}
      {showExplanation && (
        <div className="w-full lg:w-[45%] flex flex-col glass-panel absolute inset-0 z-10 lg:relative bg-panel border border-border animate-fade-in">
          
          <div className="h-12 bg-slate-100 dark:bg-slate-950/80 border-b border-border px-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-cyan flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-violet" />
              <span>AI File Insights</span>
            </span>
            <button
              onClick={() => setShowExplanation(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto text-sm leading-relaxed text-text">
            {loadingExplanation ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="w-8 h-8 text-brand-violet animate-spin" />
                <p className="text-xs text-slate-500 font-mono">Analyzing syntax & architecture...</p>
              </div>
            ) : explanation ? (
              <div className="prose dark:prose-invert max-w-none text-text space-y-4">
                <ReactMarkdown
                  components={{
                    h1: ({node: _node, ...props}) => <h1 className="text-base font-bold text-slate-900 dark:text-white border-b border-border pb-1 mt-4" {...props} />,
                    h2: ({node: _node, ...props}) => <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-4" {...props} />,
                    h3: ({node: _node, ...props}) => <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mt-3" {...props} />,
                    p: ({node: _node, ...props}) => <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300" {...props} />,
                    code: ({node: _node, inline, ...props}) => 
                      inline 
                        ? <code className="bg-slate-200/80 dark:bg-slate-900 text-brand-cyan px-1 rounded font-mono text-xs" {...props} />
                        : <code className="block bg-slate-950 border border-border p-2 rounded-lg font-mono text-xs text-slate-200 overflow-x-auto my-2" {...props} />,
                    ul: ({node: _node, ...props}) => <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm" {...props} />,
                    li: ({node: _node, ...props}) => <li className="text-slate-700 dark:text-slate-300" {...props} />
                  }}
                >
                  {explanation}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <HelpCircle className="w-10 h-10 text-slate-500 mb-2" />
                <p className="text-xs">Failed to fetch file explanation.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeViewer;
