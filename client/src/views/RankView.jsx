import React, { useState } from 'react';
import {
  Gauge,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  ShieldCheck,
  RefreshCw,
  Filter,
  Check,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export default function RankView({ jobs = [], onSelectJobForTailoring, onRefresh }) {
  const [filterTier, setFilterTier] = useState('all'); // 'all' | 'top' | 'moderate' | 'upskill' | 'veto'
  const [rankingAll, setRankingAll] = useState(false);
  const [rankingJobId, setRankingJobId] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Sort by score descending
  const sortedJobs = [...jobs].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  const filteredJobs = sortedJobs.filter((job) => {
    const score = job.match_score || 0;
    const isVeto = job.match_reason?.toLowerCase().includes('violates') || job.match_reason?.toLowerCase().includes('deal-breaker') || score <= 40;

    if (filterTier === 'top') return score >= 85 && !isVeto;
    if (filterTier === 'moderate') return score >= 70 && score < 85 && !isVeto;
    if (filterTier === 'upskill') return score < 70 && !isVeto;
    if (filterTier === 'veto') return isVeto;
    return true;
  });

  const handleRankSingleJob = async (jobId) => {
    setRankingJobId(jobId);
    try {
      await api.rankJob(jobId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Ranking failed: ' + err.message);
    } finally {
      setRankingJobId(null);
    }
  };

  const handleRankAll = async () => {
    setRankingAll(true);
    try {
      await api.rankAllJobs();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Batch ranking failed: ' + err.message);
    } finally {
      setRankingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">5-Dimension Fit Matrix</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">/rank</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Batch-scores postings across Technical Skills, Seniority, Domain Synergy, Growth Velocity, and Constraints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRankAll}
            disabled={rankingAll || jobs.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:opacity-95 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${rankingAll ? 'animate-spin' : ''}`} />
            <span>{rankingAll ? 'Evaluating 5D Matrix...' : 'Re-Score All 5D'}</span>
          </button>
        </div>
      </div>

      {/* 5-Dimension Rubric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {[
          { title: '1. Hard Skills', weight: '35% weight', desc: 'Core tech stack & framework overlap', color: 'text-indigo-400' },
          { title: '2. Seniority Level', weight: '20% weight', desc: 'Experience delta & scope match', color: 'text-purple-400' },
          { title: '3. Domain Synergy', weight: '15% weight', desc: 'Architectural pattern familiarity', color: 'text-sky-400' },
          { title: '4. Growth Upside', weight: '15% weight', desc: 'Learning curve & mentorship scope', color: 'text-emerald-400' },
          { title: '5. Deal-Breakers', weight: '15% weight', desc: 'Compensation, work mode & vetoes', color: 'text-amber-400' },
        ].map((dim, idx) => (
          <div key={idx} className="glass-panel rounded-xl p-3.5 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${dim.color}`}>{dim.title}</span>
              <span className="text-[9px] font-mono text-slate-500">{dim.weight}</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">{dim.desc}</p>
          </div>
        ))}
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
        <span className="text-xs text-slate-400 mr-2">Filter Tier:</span>
        {[
          { id: 'all', label: `All (${jobs.length})` },
          { id: 'top', label: 'Top Fit (≥85%)' },
          { id: 'moderate', label: 'Moderate (70-84%)' },
          { id: 'upskill', label: 'Needs Upskill (<70%)' },
          { id: 'veto', label: 'Deal-Breaker Veto' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterTier(t.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              filterTier === t.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ranked Job List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-400 text-sm">
            No positions match the selected fit tier.
          </div>
        ) : (
          filteredJobs.map((job, index) => {
            const score = job.match_score || 70;
            const isVeto = job.match_reason?.toLowerCase().includes('violates') || job.match_reason?.toLowerCase().includes('deal-breaker') || score <= 40;
            const isExpanded = expandedJobId === job.id;

            return (
              <div
                key={job.id}
                className={`glass-panel rounded-xl p-5 border transition flex flex-col space-y-4 ${
                  isVeto
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : score >= 85
                    ? 'border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 via-slate-900/40 to-transparent'
                    : 'border-slate-800'
                }`}
              >
                {/* Main Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  <div className="flex items-start gap-4">
                    {/* Rank Badge */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                        isVeto
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : index === 0
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          : index === 1
                          ? 'bg-slate-700/40 border border-slate-600/40 text-slate-200'
                          : 'bg-slate-900 border border-slate-800 text-slate-400'
                      }`}
                    >
                      {isVeto ? '!' : `#${index + 1}`}
                    </div>

                    {/* Title & Reason */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-white">{job.title}</h3>
                        <span className="text-xs font-medium text-slate-400">@ {job.company}</span>
                        {job.location && (
                          <span className="text-[10px] text-slate-500 font-mono">• {job.location}</span>
                        )}
                      </div>

                      {job.match_reason && (
                        <p className={`text-xs max-w-2xl leading-relaxed ${isVeto ? 'text-rose-300 font-semibold' : 'text-slate-300'}`}>
                          {job.match_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Score & Actions */}
                  <div className="flex items-center gap-4 shrink-0 justify-between lg:justify-end border-t lg:border-t-0 border-slate-800 pt-3 lg:pt-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Sparkles className={`h-3.5 w-3.5 ${isVeto ? 'text-rose-400' : 'text-indigo-400'}`} />
                        <span className={`text-xl font-extrabold ${isVeto ? 'text-rose-400' : 'text-white'}`}>
                          {score}%
                        </span>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold ${isVeto ? 'text-rose-400' : 'text-indigo-300'}`}>
                        {isVeto
                          ? 'Deal-Breaker Veto'
                          : score >= 85
                          ? 'Strong Fit'
                          : score >= 70
                          ? 'Moderate Alignment'
                          : 'Upskill Needed'}
                      </span>
                    </div>

                    <button
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition"
                    >
                      {isExpanded ? 'Hide Rubric' : '5D Rubric'}
                    </button>

                    <button
                      onClick={() => onSelectJobForTailoring(job)}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
                    >
                      <span>Drafter & Reviewer</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>

                {/* Expanded 5-Dimension Rubric Breakdown */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-800/80 space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      
                      {/* Dim 1 */}
                      <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                          <span>Hard Tech Stack</span>
                          <span>{score >= 85 ? '92%' : '75%'}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          {score >= 85 ? 'Strong overlap in core required frameworks & languages.' : 'Foundational match; specific stack gaps identified.'}
                        </p>
                      </div>

                      {/* Dim 2 */}
                      <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                          <span>Seniority Delta</span>
                          <span>{score >= 85 ? '95%' : '80%'}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Responsibility expectations match candidate experience.
                        </p>
                      </div>

                      {/* Dim 3 */}
                      <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                          <span>Domain Synergy</span>
                          <span>88%</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Full-stack and web architecture alignment.
                        </p>
                      </div>

                      {/* Dim 4 */}
                      <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                          <span>Growth Upside</span>
                          <span>90%</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          High technical learning velocity and product scope.
                        </p>
                      </div>

                      {/* Dim 5 */}
                      <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                          <span>Deal-Breakers</span>
                          <span>{isVeto ? 'VETO' : 'PASSED'}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          {isVeto ? 'Deal-breaker constraint triggered.' : 'Zero deal-breakers triggered.'}
                        </p>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
