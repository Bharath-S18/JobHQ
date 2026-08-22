import React, { useState } from 'react';
import {
  Mic,
  Sparkles,
  Bot,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Send,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function InterviewView({ jobs = [] }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || null);
  const [mockMode, setMockMode] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to your AI Mock Interview! I have reviewed your master profile and the target position. Let us start with a foundational question: "Tell me about a complex full-stack problem you solved recently and how you evaluated the architectural trade-offs?"',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const activeJob = jobs.find((j) => j.id === selectedJobId) || jobs[0] || null;

  const starExamples = [
    {
      title: 'High-Concurrency Event Processing (STAR)',
      situation: 'System experienced high traffic spikes causing delayed order updates.',
      task: 'Optimize event dispatch pipeline without increasing infrastructure costs.',
      action: 'Engineered an asynchronous queue using Redis and Express batch workers with retry backoff.',
      result: 'Reduced p95 latency by 48% and maintained 99.9% uptime during surge traffic.',
    },
    {
      title: 'State Management & UI Performance (STAR)',
      situation: 'React dashboard suffered unnecessary re-renders with large live data feeds.',
      task: 'Refactor state tree and component memoization for smooth 60fps rendering.',
      action: 'Isolated state slices, added custom selectors, and virtualized list views.',
      result: 'Lowered bundle payload by 22% and eliminated main thread blocking.',
    },
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setInputMessage('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Great response! You clearly structured the situation and action. To make it even stronger for ${activeJob?.company || 'this role'}, consider quantifying the business impact or mentioning how you ensured backward compatibility. Next question: "How do you handle disagreement with peers on API design?"`,
        },
      ]);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">STAR Interview Prep Hub</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">/interview</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Company intel briefing, STAR behavioral answer banks, and interactive AI mock interview simulation.
          </p>
        </div>

        {/* Target Job Selector */}
        {jobs.length > 0 && (
          <select
            value={selectedJobId || ''}
            onChange={(e) => setSelectedJobId(Number(e.target.value))}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-none"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} @ {j.company}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Grid: STAR Bank + Interactive Mock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: STAR Question Bank (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Grounding STAR Response Bank
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>

            <div className="space-y-3">
              {starExamples.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2"
                >
                  <h4 className="text-xs font-bold text-indigo-300">{item.title}</h4>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <p><strong className="text-slate-400">S:</strong> {item.situation}</p>
                    <p><strong className="text-slate-400">T:</strong> {item.task}</p>
                    <p><strong className="text-slate-400">A:</strong> {item.action}</p>
                    <p><strong className="text-emerald-400">R:</strong> {item.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Mock Interview Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4 flex flex-col h-[520px]">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">
                  Live Mock Interviewer ({activeJob ? `${activeJob.title} @ ${activeJob.company}` : 'Roleplay'})
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Live Simulator
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-200'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your answer (using STAR framework)..."
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

          </div>
        </div>

      </div>

    </div>
  );
}
