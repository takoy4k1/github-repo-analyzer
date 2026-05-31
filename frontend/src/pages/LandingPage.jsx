import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Terminal, 
  Search, 
  Network, 
  MessageSquareCode, 
  Code, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  GitBranch
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Background Neon Blobs */}
      <div className="bg-radial-glow bg-brand-indigo/10 w-[500px] h-[500px] top-10 left-[-200px] absolute pointer-events-none z-0" />
      <div className="bg-radial-glow bg-brand-cyan/5 w-[600px] h-[600px] bottom-10 right-[-200px] absolute pointer-events-none z-0" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 max-w-4xl mx-auto"
        >
          {/* Heading */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-text"
          >
            Explain Any <span className="bg-gradient-to-r from-brand-cyan via-brand-indigo to-brand-violet bg-clip-text text-transparent">GitHub Repository</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            variants={itemVariants}
            className="text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            Paste a repository link to explore its structure, visualize architecture dependencies, read instant file guides, and chat with your codebase using semantic search.
          </motion.p>

          {/* Call to Action */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link 
              to={user ? "/dashboard" : "/auth"} 
              className="btn-glow-violet group flex items-center space-x-2 py-3.5 px-7 text-base font-semibold shadow-lg"
            >
              <span>Analyze a Repository</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <a 
              href="#features" 
              className="px-6 py-3.5 rounded-xl border border-border bg-panel text-text font-semibold hover:bg-slate-150 dark:hover:bg-slate-800 transition-all text-sm sm:text-base cursor-pointer"
            >
              Explore Features
            </a>
          </motion.div>
        </motion.div>
      </section>


      {/* Product Mockup Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10">
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
          className="glass-panel overflow-hidden p-2 shadow-2xl"
        >
          {/* Mock Browser Header */}
          <div className="bg-panel rounded-t-xl px-4 py-3 flex items-center justify-between border-b border-border">
            <div className="flex space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 block" />
            </div>
            <div className="bg-background border border-border rounded-lg px-6 py-1 text-[10px] sm:text-xs text-slate-500 font-mono flex items-center space-x-1.5">
              <GitBranch className="w-3 h-3 text-slate-600" />
              <span>github.com/facebook/react</span>
            </div>
            <div className="w-12" /> {/* spacer */}
          </div>
          {/* Mock UI preview image */}
          <div className="bg-background/20 aspect-[16/9] w-full flex items-center justify-center p-8 bg-gradient-to-br from-panel to-background relative overflow-hidden">
            
            {/* Visual simulation content */}
            <div className="max-w-xl text-center space-y-4">
              <div className="p-4 bg-panel border border-border rounded-2xl inline-flex space-x-2 items-center shadow-lg">
                <Terminal className="w-5 h-5 text-brand-cyan" />
                <span className="text-xs font-mono text-text">cloning, chunking, generating embeddings...</span>
                <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3 bg-panel rounded-xl border border-border">
                  <span className="text-[10px] text-slate-500 block">Languages</span>
                  <span className="text-sm font-semibold text-text">JavaScript, HTML, CSS</span>
                </div>
                <div className="p-3 bg-panel rounded-xl border border-border">
                  <span className="text-[10px] text-slate-500 block">Architecture</span>
                  <span className="text-sm font-semibold text-text">MVC / Modules</span>
                </div>
              </div>
            </div>

            {/* Glowing borders */}
            <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-brand-indigo/50 to-transparent" />
            <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-brand-cyan/50 to-transparent" />
          </div>
        </motion.div>
      </section>


      {/* Features Showcase */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 border-t border-border">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-text">Codebase Comprehension Engine</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">Everything you need to analyze, learn, and onboard onto complex software projects in minutes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="glass-panel-interactive p-6 space-y-4">
            <div className="p-3 bg-brand-violet/10 rounded-xl text-brand-violet w-fit">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-text">GitHub Analyzer</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Simply paste any public Git URL. We index all files, lines, and configurations automatically.</p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel-interactive p-6 space-y-4">
            <div className="p-3 bg-brand-cyan/10 rounded-xl text-brand-cyan w-fit">
              <MessageSquareCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-text">Semantic Chatbot</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Ask how specific integrations, routers, or database structures work. Get precise, context-aware answers.</p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel-interactive p-6 space-y-4">
            <div className="p-3 bg-brand-indigo/10 rounded-xl text-brand-indigo w-fit">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-text">Architecture Flow</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Render interactive visual flowcharts (Mermaid diagrams) outlining dependencies and layout models.</p>
          </div>

          {/* Card 4 */}
          <div className="glass-panel-interactive p-6 space-y-4">
            <div className="p-3 bg-brand-emerald/10 rounded-xl text-brand-emerald w-fit">
              <Code className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-text">File Explainers</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Click any code file in the tree to read its purpose, variables, functions, and role in the system.</p>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 bg-panel text-center text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© 2026 RepoMind AI. Built using the MERN stack with vector-based RAG architecture.</p>
          <p className="text-slate-500 dark:text-slate-600">Premium design styled with Vanilla CSS and Tailwind CSS.</p>
        </div>
      </footer>
    </div>
  );
};


export default LandingPage;
