import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Network, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Initialize mermaid configurations
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'JetBrains Mono, Outfit, sans-serif',
  themeVariables: {
    background: '#0b0f19',
    primaryColor: '#6366f1',
    primaryTextColor: '#f1f5f9',
    lineColor: '#374151',
    primaryBorderColor: '#8b5cf6',
    nodeBorder: '#8b5cf6',
    mainBkg: '#0b0f19',
    textColor: '#cbd5e1'
  }
});

const MermaidDiagram = ({ chartCode, repoId, repoUrl }) => {
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!repoUrl) return;
    setGenerating(true);
    const toastId = toast.loading('Re-analyzing repository to construct system map...');
    try {
      await api.post('/repos/analyze', { url: repoUrl });
      toast.success('Analysis initiated! Directing to Dashboard to track progress.', { id: toastId });
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to trigger analysis. Please check your network or try again.', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!chartCode) return;

    const renderDiagram = async () => {
      const id = `mermaid-render-${Math.floor(Math.random() * 1000000)}`;
      try {
        setError(null);
        
        // Clean up previous SVG container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Clean up trailing/leading spaces or markdown markers if any
        let cleanCode = chartCode.trim();
        if (cleanCode.startsWith('```mermaid')) {
          cleanCode = cleanCode.replace(/^```mermaid\n/, '').replace(/\n```$/, '');
        } else if (cleanCode.startsWith('```')) {
          cleanCode = cleanCode.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        // Sanitizer rules:
        // 1. Remove trailing semicolons and split statements into separate lines (common LLM error)
        cleanCode = cleanCode.split('\n')
          .map(line => line.trim().replace(/;$/, ''))
          .join('\n')
          .replace(/; /g, '\n')
          .replace(/;/g, '\n');

        // 2. Fix unquoted node labels with spaces/dots/slashes inside parentheses: e.g. A(Alpha Vantage API) -> A["Alpha Vantage API"]
        cleanCode = cleanCode.replace(/(\w+)\(([^)]+)\)/g, (match, nodeId, label) => {
          if (/[ .\/\-_]/.test(label)) {
            return `${nodeId}["${label}"]`;
          }
          return match;
        });

        // 3. Make sure we have a graph definition
        if (!cleanCode.startsWith('graph ') && !cleanCode.startsWith('flowchart ')) {
          cleanCode = 'graph TD\n' + cleanCode;
        }

        const { svg } = await mermaid.render(id, cleanCode);
        setSvgContent(svg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Could not render architecture diagram automatically. There may be a Mermaid syntax error.');
        
        // Clean up dirty elements generated in body by mermaid failure
        const badElement = document.getElementById(id);
        if (badElement) badElement.remove();
        
        const bindElement = document.getElementById(`d${id}`);
        if (bindElement) bindElement.remove();
      }
    };

    // Small timeout to allow DOM to ready
    const timer = setTimeout(() => {
      renderDiagram();
    }, 100);

    return () => clearTimeout(timer);
  }, [chartCode]);

  if (!chartCode) {
    return (
      <div className="flex flex-col items-center justify-center p-10 border border-border rounded-2xl bg-slate-200/20 dark:bg-slate-950/40 text-center max-w-xl mx-auto my-10 space-y-5">
        <div className="p-4 bg-brand-violet/10 rounded-2xl text-brand-violet">
          <Network className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">No architecture diagram available yet</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed font-sans">
            Run analysis to generate an AI-powered system map showing:
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-500 space-y-1 font-mono text-left inline-block">
            <li className="flex items-center space-x-2">
              <span className="text-brand-cyan font-bold">✔</span>
              <span>frontend ↔ backend relationships</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-brand-cyan font-bold">✔</span>
              <span>modules & dependencies</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-brand-cyan font-bold">✔</span>
              <span>API flow</span>
            </li>
          </ul>
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={generating || !repoUrl}
          className="btn-glow-violet text-xs px-5 py-2.5 flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
        >
          {generating ? (
            <span className="animate-spin mr-1">⚡</span>
          ) : (
            <span className="font-bold">⚡</span>
          )}
          <span>{generating ? 'Initiating Analysis...' : 'Generate Diagram'}</span>
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-amber-500/20 rounded-2xl bg-amber-950/10 text-amber-600 dark:text-amber-300 flex items-start space-x-3 max-w-xl mx-auto">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-semibold">Diagram Generation Warning</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{error}</p>
          <details className="text-[10px] text-slate-600 dark:text-slate-500 bg-slate-200/50 dark:bg-black/40 p-2 rounded cursor-pointer">
            <summary className="font-mono">Raw Mermaid Code</summary>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono">{chartCode}</pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-200/20 dark:bg-slate-950/40 rounded-2xl border border-border shadow-inner overflow-x-auto w-full min-h-[400px]">
      <div 
        ref={containerRef}
        className="w-full flex justify-center items-center"
        dangerouslySetInnerHTML={{ __html: svgContent }} 
      />
    </div>
  );
};

export default MermaidDiagram;
