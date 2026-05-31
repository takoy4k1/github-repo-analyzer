import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Sparkles, MessageSquare, Plus, Loader2, ChevronRight, BookOpen } from 'lucide-react';
import api from '../services/api';

const ChatPanel = ({ repositoryId, onSelectFile }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const loadSession = async (sessionId) => {
    try {
      const response = await api.get(`/chats/${sessionId}`);
      setCurrentSession(response.data);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading session:', error.message);
    }
  };

  const handleNewSession = async () => {
    try {
      const response = await api.post('/chats', {
        repositoryId,
        title: `Chat Session ${sessions.length + 1}`
      });
      setSessions([response.data, ...sessions]);
      setCurrentSession(response.data);
      setMessages([]);
    } catch (error) {
      console.error('Error creating session:', error.message);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get(`/chats?repositoryId=${repositoryId}`);
      setSessions(response.data);
      if (response.data.length > 0) {
        // Load the most recent session
        loadSession(response.data[0]._id);
      } else {
        // Auto create first session
        handleNewSession();
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error.message);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat sessions for this repository
  useEffect(() => {
    if (repositoryId) {
      fetchSessions();
    }
  }, [repositoryId]);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);



  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentSession || loading) return;

    const userMessage = {
      role: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await api.post(`/chats/${currentSession._id}/message`, {
        content: userMessage.content
      });

      setMessages(prev => [...prev, response.data]);
      
      // Update session title if it was default and it's the first message
      if (messages.length === 0) {
        const titleSnippet = userMessage.content.slice(0, 25) + '...';
        await api.post(`/chats`, { repositoryId, title: titleSnippet }); // trigger name update or fallback
        fetchSessions();
      }
    } catch (error) {
      console.error('Error sending message:', error.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to process request. Ensure the backend server and LLM configuration are online.'
      }]);
    } finally {
      setLoading(false);
    }
  };  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] glass-panel overflow-hidden">
      
      {/* Header */}
      <div className="p-4 bg-slate-100 dark:bg-slate-950/80 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-brand-cyan" />
          <span className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">Repository AI Chat</span>
        </div>
        <button
          onClick={handleNewSession}
          className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-brand-violet/10 text-brand-violet hover:bg-brand-violet/20 border border-brand-violet/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Session selector */}
      {sessions.length > 1 && (
        <div className="px-4 py-2 border-b border-border bg-slate-200/20 dark:bg-slate-950/30 flex items-center space-x-2 overflow-x-auto">
          <span className="text-[10px] text-slate-600 dark:text-slate-500 uppercase tracking-wider font-semibold">Chats:</span>
          {sessions.map(s => (
            <button
              key={s._id}
              onClick={() => loadSession(s._id)}
              className={`text-xs px-2.5 py-1 rounded-md shrink-0 transition-all cursor-pointer ${
                currentSession?._id === s._id
                  ? 'bg-slate-300/50 dark:bg-white/10 text-slate-800 dark:text-white font-medium border border-border dark:border-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 border border-transparent'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-6 space-y-3">
            <div className="p-3 bg-brand-indigo/10 rounded-full text-brand-indigo shadow-neon-violet/10">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-300">Ask anything about the codebase</p>
              <p className="text-xs text-slate-600 dark:text-slate-500">How does authentication work? Where is the database configured? Explain state management.</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index}
              className={`flex flex-col max-w-[85%] rounded-2xl p-4 ${
                msg.role === 'user'
                  ? 'bg-brand-indigo/10 border border-brand-indigo/20 self-end ml-auto text-slate-800 dark:text-slate-200'
                  : 'bg-slate-200/30 dark:bg-slate-900/60 border border-border dark:border-white/5 self-start text-slate-800 dark:text-slate-300'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center space-x-1.5 mb-2">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${
                  msg.role === 'user' ? 'text-brand-cyan' : 'text-brand-violet'
                }`}>
                  {msg.role === 'user' ? 'You' : 'RepoMind AI'}
                </span>
              </div>

              {/* Message Body */}
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm font-sans space-y-2 text-text">
                <ReactMarkdown
                  components={{
                    p: ({node: _node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    code: ({node: _node, inline, ...props}) => 
                      inline 
                        ? <code className="bg-slate-200 dark:bg-slate-955 text-brand-cyan px-1 rounded font-mono text-xs" {...props} />
                        : <code className="block bg-slate-955 border border-border p-2 rounded-lg font-mono text-xs text-slate-200 overflow-x-auto my-2" {...props} />,
                    ul: ({node: _node, ...props}) => <ul className="list-disc pl-4 space-y-1 text-xs" {...props} />,
                    ol: ({node: _node, ...props}) => <ol className="list-decimal pl-4 space-y-1 text-xs" {...props} />,
                    li: ({node: _node, ...props}) => <li className="text-slate-700 dark:text-slate-300" {...props} />
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* RAG Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border space-y-1.5">
                  <div className="flex items-center space-x-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <BookOpen className="w-3 h-3" />
                    <span>References:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((cite, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => onSelectFile(cite.filePath)}
                        className="flex items-center space-x-1 text-[10px] font-mono px-2 py-1 rounded bg-slate-200 dark:bg-slate-955 hover:bg-slate-300/50 dark:hover:bg-slate-900 border border-border dark:border-white/5 text-slate-700 dark:text-slate-400 hover:text-brand-cyan transition-all cursor-pointer"
                        title="Click to view file context"
                      >
                        <span className="truncate max-w-[120px]">{cite.filePath.split('/').pop()}</span>
                        <span className="text-slate-500 dark:text-slate-600">L{cite.startLine}-{cite.endLine}</span>
                        <ChevronRight className="w-2.5 h-2.5 text-slate-500 dark:text-slate-600" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Thinking loader */}
        {loading && (
          <div className="bg-slate-200/30 dark:bg-slate-900/60 border border-border rounded-2xl p-4 self-start max-w-[80%] flex items-center space-x-2 animate-pulse">
            <Loader2 className="w-4 h-4 text-brand-violet animate-spin" />
            <span className="text-xs text-slate-500 font-mono">Querying codebase index...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-100 dark:bg-slate-950/80 border-t border-border flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about authentication, files, variables..."
          className="flex-1 bg-background border border-border focus:border-brand-violet/50 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-text outline-none transition-all placeholder:text-slate-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white transition-all disabled:opacity-40 hover:brightness-110 shadow-neon-violet/10 shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};

export default ChatPanel;
