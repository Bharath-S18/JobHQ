import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BookOpen,
  Clock,
  ExternalLink,
  Sparkles,
  Award,
  Layers,
  CheckCircle2,
  Plus,
  RefreshCw,
  Target,
  Flame
} from 'lucide-react';
import { api } from '../services/api';

export default function UpskillView({ jobs = [], profile, onRefreshProfile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState('All');
  const [addingSkill, setAddingSkill] = useState(null);

  useEffect(() => {
    loadHeatmap();
  }, [jobs.length]);

  const loadHeatmap = async () => {
    setLoading(true);
    try {
      const res = await api.getUpskillHeatmap();
      setData(res);
    } catch (err) {
      console.warn('Failed to load upskill heatmap:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (skillName) => {
    setAddingSkill(skillName);
    try {
      await api.addSkillToProfile(skillName);
      if (onRefreshProfile) onRefreshProfile();
      await loadHeatmap();
    } catch (err) {
      alert('Failed to add skill: ' + err.message);
    } finally {
      setAddingSkill(null);
    }
  };

  const skills = data?.skills || [
    { skill: 'Next.js', key: 'next.js', track: 'Frontend Architecture', demandScore: 92, frequency: '84% (tracked postings)', roadmap: 'App router, Server Components, Streaming SSR, Server Actions', time: '1-2 weeks', link: 'https://nextjs.org/docs', mastered: false },
    { skill: 'Docker', key: 'docker', track: 'Cloud & DevOps', demandScore: 88, frequency: '72% (tracked postings)', roadmap: 'Multi-stage builds, Container networks, Compose orchestration', time: '1 week', link: 'https://docs.docker.com', mastered: false },
    { skill: 'TypeScript', key: 'typescript', track: 'Core Languages', demandScore: 95, frequency: '90% (tracked postings)', roadmap: 'Generics, Utility types, Type narrowing, Discriminated unions', time: '1 week', link: 'https://www.typescriptlang.org', mastered: true },
    { skill: 'PostgreSQL', key: 'postgresql', track: 'Database Systems', demandScore: 85, frequency: '65% (tracked postings)', roadmap: 'Indexing strategies, EXPLAIN ANALYZE, Connection pooling, ACID constraints', time: '1-2 weeks', link: 'https://www.postgresql.org/docs', mastered: true },
    { skill: 'Redis', key: 'redis', track: 'Distributed Systems', demandScore: 80, frequency: '58% (tracked postings)', roadmap: 'In-memory caching patterns, Pub/Sub, Rate limiters, Session store', time: '1 week', link: 'https://redis.io/docs', mastered: false },
  ];

  const tracks = ['All', ...Array.from(new Set(skills.map((s) => s.track)))];

  const filteredSkills = selectedTrack === 'All'
    ? skills
    : skills.filter((s) => s.track === selectedTrack);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Career Intelligence & Upskill Heatmap</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">/upskill</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated skill gap analysis across all scraped postings and personalized learning roadmaps.
          </p>
        </div>

        <button
          onClick={loadHeatmap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 text-xs font-medium text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Analyzed Postings</span>
            <Target className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{jobs.length}</p>
          <span className="text-[10px] text-slate-500">Live scraped & imported positions</span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span>Profile Mastered Skills</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {skills.filter((s) => s.mastered).length}
          </p>
          <span className="text-[10px] text-slate-500">Verified in Master Profile</span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Target Upskill Opportunities</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {skills.filter((s) => !s.mastered).length}
          </p>
          <span className="text-[10px] text-slate-500">High ROI market competencies</span>
        </div>
      </div>

      {/* Filter by Technical Track */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tracks.map((track) => (
          <button
            key={track}
            onClick={() => setSelectedTrack(track)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedTrack === track
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {track}
          </button>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSkills.map((item, idx) => (
          <div
            key={idx}
            className={`glass-panel rounded-2xl p-5 border ${
              item.mastered
                ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/10 to-slate-900/40'
                : 'border-slate-800'
            } space-y-3 flex flex-col justify-between`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{item.skill}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {item.track}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                    {item.demandScore}% Demand
                  </span>
                  {item.mastered && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Mastered</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${
                    item.mastered
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  }`}
                  style={{ width: `${item.demandScore}%` }}
                />
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Learning Roadmap Track
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {item.roadmap}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Est: {item.time}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{item.frequency}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 transition"
                    title="Open Official Documentation"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                {!item.mastered && (
                  <button
                    onClick={() => handleAddSkill(item.skill)}
                    disabled={addingSkill === item.skill}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{addingSkill === item.skill ? 'Adding...' : 'Mark Mastered'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
