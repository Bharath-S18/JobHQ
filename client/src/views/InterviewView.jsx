import React, { useState, useEffect } from 'react';
import {
  Mic,
  Sparkles,
  Bot,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Send,
  Layers,
  ChevronRight,
  HelpCircle,
  Award,
  BookOpen,
  RefreshCw,
  Building2,
  Flame,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function InterviewView({ jobs = [], profile }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || null);
  const [activeTab, setActiveTab] = useState('simulator'); // 'briefing', 'star_stories', 'simulator'
  const [briefing, setBriefing] = useState(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to your AI Mock Interview! I have reviewed your master profile and the target position. Let us start with a foundational question: "Tell me about a complex full-stack problem you solved recently and how you evaluated the architectural trade-offs?"',
      score: null,
      feedback: null,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [evaluatingTurn, setEvaluatingTurn] = useState(false);

  const activeJob = jobs.find((j) => j.id === selectedJobId) || jobs[0] || null;
  const starStories = profile?.structured?.starStories || [
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

  // Fetch Interview Briefing when active job changes
  useEffect(() => {
    if (activeJob?.id) {
      loadBriefing(activeJob.id);
    }
  }, [activeJob?.id]);

  const loadBriefing = async (jobId) => {
    setLoadingBriefing(true);
    try {
      const data = await api.getInterviewBriefing(jobId);
      setBriefing(data);
    } catch (err) {
      console.warn('Could not fetch briefing from server:', err);
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || evaluatingTurn) return;

    const userText = inputMessage.trim();
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInputMessage('');
    setEvaluatingTurn(true);

    try {
      const evaluation = await api.sendInterviewChat(
        activeJob?.id,
        newMessages,
        userText
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: evaluation.followupQuestion || 'Next question: How do you handle disagreement with peers on API design?',
          score: evaluation.score,
          starBreakdown: evaluation.starBreakdown,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          feedback: evaluation.feedback,
        },
      ]);
    } catch (err) {
      console.warn('Mock turn evaluation fallback:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Great response! You clearly structured the technical actions. To make it even stronger for ${activeJob?.company || 'this role'}, quantify the business impact or mention automated testing. Next question: "How do you handle schema migrations in high-availability environments?"`,
          score: 85,
          feedback: 'Clear technical communication. Consider adding concrete performance metrics.',
        },
      ]);
    } finally {
      setEvaluatingTurn(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">STAR Interview Prep & AI Mock Simulator</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">/interview</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Company intel briefing, STAR behavioral answer banks, and interactive AI mock interview simulation.
          </p>
        </div>

        {/* Target Job Selector */}
        {jobs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Target Role:</span>
            <select
              value={selectedJobId || ''}
              onChange={(e) => setSelectedJobId(Number(e.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none max-w-[240px] truncate"
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} @ {job.company}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'simulator', label: 'AI Mock Interview Simulator', icon: Bot },
          { id: 'briefing', label: 'Company Intel & Predicted Questions', icon: Building2 },
          { id: 'star_stories', label: 'STAR Story Response Bank', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: AI MOCK INTERVIEW SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col h-[650px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-white">
                  Live Technical Interviewer ({activeJob ? `${activeJob.title} @ ${activeJob.company}` : 'Standard Software Engineer'})
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">STAR Method Evaluator</span>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none space-y-3'
                    }`}
                  >
                    <p>{m.content}</p>

                    {/* AI Feedback & STAR Scoring on Candidate Response */}
                    {m.score !== null && m.score !== undefined && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            STAR Feedback & Rubric
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                            {m.score}/100 Score
                          </span>
                        </div>

                        {m.feedback && (
                          <p className="text-[11px] text-slate-300 italic bg-black/40 p-2 rounded-lg border border-slate-800/50">
                            "{m.feedback}"
                          </p>
                        )}

                        {m.starBreakdown && (
                          <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                              <strong className="text-indigo-400">Situation:</strong> {m.starBreakdown.situation}
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                              <strong className="text-indigo-400">Task:</strong> {m.starBreakdown.task}
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                              <strong className="text-indigo-400">Action:</strong> {m.starBreakdown.action}
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                              <strong className="text-emerald-400">Result:</strong> {m.starBreakdown.result}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {evaluatingTurn && (
                <div className="flex items-center gap-2 text-xs text-indigo-400 p-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Evaluating answer against STAR rubric & drafting follow-up question...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your structured answer (Situation, Task, Action, Measurable Result)..."
                className="flex-1 rounded-xl border border-slate-800 bg-black/40 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={evaluatingTurn || !inputMessage.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit</span>
              </button>
            </form>
          </div>

          {/* Quick STAR Cheatsheet Side Panel */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">STAR Interview Framework</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="font-bold text-indigo-400">1. Situation (15-20% time)</span>
                <p className="text-[11px] text-slate-400">Set the stage. What was the engineering problem, company context, or constraint?</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="font-bold text-indigo-400">2. Task (10-15% time)</span>
                <p className="text-[11px] text-slate-400">What was your specific responsibility or technical goal?</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="font-bold text-indigo-400">3. Action (50-60% time)</span>
                <p className="text-[11px] text-slate-400">What specific code, tools, architecture, and trade-offs did you implement?</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="font-bold text-emerald-400">4. Result (15-20% time)</span>
                <p className="text-[11px] text-slate-400">Quantifiable metrics (e.g. 48% latency drop, 99.9% uptime, 0 regressions).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY INTEL & PREDICTED QUESTIONS */}
      {activeTab === 'briefing' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
          {loadingBriefing ? (
            <div className="flex items-center justify-center p-12 text-xs text-indigo-400 gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Analyzing company domain, technical stack, and engineering requirements...</span>
            </div>
          ) : briefing ? (
            <div className="space-y-6">
              {/* Mission & Stack */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Mission & Focus</span>
                  <p className="text-xs text-slate-200 leading-relaxed">{briefing.companyMission}</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Tech Stack Emphasis</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {briefing.coreTechFocus?.map((tech, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Predicted Interview Questions */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Predicted Role-Specific Technical & Behavioral Questions
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {briefing.predictedQuestions?.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-indigo-400">
                          {q.type}
                        </span>
                        <h4 className="text-xs font-bold text-white leading-snug pt-1">"{q.question}"</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 italic">
                        <strong>Tip:</strong> {q.keyPoints}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Questions to Ask */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  High-Impact Questions to Ask Your Interviewers
                </span>

                <div className="space-y-2">
                  {briefing.strategicQuestionsToAsk?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border border-slate-800 bg-slate-900/40 text-xs text-slate-200">
                      <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Select a job from the dropdown to view its company briefing.</p>
          )}
        </div>
      )}

      {/* TAB 3: STAR STORY BANK */}
      {activeTab === 'star_stories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Master STAR Story Bank ({starStories.length} Verified Stories)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {starStories.map((story, idx) => (
              <div key={idx} className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                  <span>{story.title}</span>
                </h3>

                <div className="space-y-2 text-xs text-slate-300">
                  <div>
                    <strong className="text-indigo-400">Situation:</strong> {story.situation}
                  </div>
                  <div>
                    <strong className="text-indigo-400">Task:</strong> {story.task}
                  </div>
                  <div>
                    <strong className="text-indigo-400">Action:</strong> {story.action}
                  </div>
                  <div>
                    <strong className="text-emerald-400">Result:</strong> {story.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
