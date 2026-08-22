import React from 'react';
import {
  Gauge,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  ShieldCheck
} from 'lucide-react';

export default function RankView({ jobs = [], onSelectJobForTailoring }) {
  // Sort jobs by match score descending
  const rankedJobs = [...jobs].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

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
            Evaluates technical skills, seniority delta, domain synergy, career growth, and compensation constraints.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Strict Anti-Hallucination Grounding</span>
        </div>
      </div>

      {/* 5-Dimension Rubric Info Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {[
          { title: '1. Hard Skills', desc: 'Core tech stack & framework overlap', color: 'text-indigo-400' },
          { title: '2. Experience Level', desc: 'Seniority & responsibility alignment', color: 'text-purple-400' },
          { title: '3. Domain Fit', desc: 'Industry & architectural patterns', color: 'text-sky-400' },
          { title: '4. Growth Velocity', desc: 'Impact, learning & upside', color: 'text-emerald-400' },
          { title: '5. Constraints', desc: 'Location, visa & salary criteria', color: 'text-amber-400' },
        ].map((dim, idx) => (
          <div key={idx} className="glass-panel rounded-xl p-3 border border-slate-800/80 space-y-1">
            <span className={`text-xs font-bold ${dim.color}`}>{dim.title}</span>
            <p className="text-[10px] text-slate-400 leading-snug">{dim.desc}</p>
          </div>
        ))}
      </div>

      {/* Ranked Job List */}
      <div className="space-y-4">
        {rankedJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-400 text-sm">
            No jobs available for ranking. Scout or add postings first.
          </div>
        ) : (
          rankedJobs.map((job, index) => {
            const score = job.match_score || 70;
            const isTopMatch = score >= 85;

            return (
              <div
                key={job.id}
                className={`glass-panel rounded-xl p-5 border transition flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                  isTopMatch ? 'border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 to-transparent' : 'border-slate-800'
                }`}
              >
                {/* Left: Rank #, Title, Reason */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                      index === 0
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                        : index === 1
                        ? 'bg-slate-700/40 border border-slate-600/40 text-slate-200'
                        : index === 2
                        ? 'bg-amber-700/20 border border-amber-700/40 text-amber-400'
                        : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}
                  >
                    #{index + 1}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white">{job.title}</h3>
                      <span className="text-xs font-medium text-slate-400">@ {job.company}</span>
                    </div>

                    {job.match_reason && (
                      <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                        {job.match_reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Score breakdown & Action */}
                <div className="flex items-center gap-6 shrink-0 justify-between lg:justify-end border-t lg:border-t-0 border-slate-800 pt-3 lg:pt-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-xl font-extrabold text-white">{score}%</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-300">
                      {score >= 85 ? 'Strong Fit' : score >= 70 ? 'Moderate Alignment' : 'Requires Upskill'}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectJobForTailoring(job)}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
                  >
                    <span>Drafter & Reviewer</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
