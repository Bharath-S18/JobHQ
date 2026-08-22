import React from 'react';
import {
  Sparkles,
  TrendingUp,
  Briefcase,
  CheckCircle,
  Clock,
  ArrowRight,
  Zap,
  Mail,
  FileText,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export default function DashboardView({
  jobs = [],
  profile,
  onSelectTab,
  onSelectJobForTailoring,
  onScanAlerts,
  scanning
}) {
  const totalJobs = jobs.length;
  const tailoredJobs = jobs.filter((j) => j.status === 'tailored' || j.tailored_resume).length;
  const interviewingJobs = jobs.filter((j) => j.status === 'interviewing').length;
  const appliedJobs = jobs.filter((j) => j.status === 'applied').length;
  
  // Calculate average match score
  const scoredJobs = jobs.filter((j) => typeof j.match_score === 'number' && j.match_score > 0);
  const avgScore = scoredJobs.length
    ? Math.round(scoredJobs.reduce((acc, j) => acc + j.match_score, 0) / scoredJobs.length)
    : 0;

  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Full-Stack Job Search Intelligence</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Autonomous Career Agent & Application Studio
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Drafter-Reviewer 2-agent application tailoring, 5-dimension fit evaluation, live Gmail alert harvesting, and proactive follow-up engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectTab('hunter')}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
            >
              <Zap className="h-4 w-4" />
              <span>Scout Portals</span>
            </button>

            <button
              onClick={onScanAlerts}
              disabled={scanning}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition disabled:opacity-50"
            >
              <Mail className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning Gmail...' : 'Scan Gmail Alerts'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Opportunities */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Discovered Jobs</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalJobs}</div>
          <p className="text-xs text-slate-400">Across all scouts & alerts</p>
        </div>

        {/* Card 2: Average Alignment */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Fit Match</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-400 mb-1">{avgScore}%</div>
          <p className="text-xs text-slate-400">Evaluated candidate alignment</p>
        </div>

        {/* Card 3: Tailored Applications */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Tailored Packs</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-1">{tailoredJobs}</div>
          <p className="text-xs text-slate-400">Reviewed & ready to submit</p>
        </div>

        {/* Card 4: Active Interviews */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Interview Pipeline</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400 mb-1">{interviewingJobs}</div>
          <p className="text-xs text-slate-400">Active rounds in progress</p>
        </div>

      </div>

      {/* Master Profile Status & Next Action */}
      {!profile?.structured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Master Profile Not Configured</p>
              <p className="text-xs text-amber-400/80">
                Upload your PDF resume in Profile Studio so the 2-agent drafter and fit evaluator can ground applications in your verified experience.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('profile')}
            className="shrink-0 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition"
          >
            Setup Profile
          </button>
        </div>
      )}

      {/* Recent Discovered Jobs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Recent Opportunities</span>
            <span className="text-xs text-slate-400 font-normal">({recentJobs.length} of {totalJobs})</span>
          </h2>
          <button
            onClick={() => onSelectTab('hunter')}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
          >
            <span>View all opportunities</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center space-y-3">
            <p className="text-sm text-slate-400">No jobs tracked yet.</p>
            <button
              onClick={() => onSelectTab('hunter')}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 transition"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Start Hunter Scout or Add Job</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 rounded-xl border border-slate-800 bg-[#10121a] overflow-hidden">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white hover:text-indigo-400 transition cursor-pointer">
                      {job.title}
                    </span>
                    {job.ats && (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                        {job.ats}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">{job.company || 'Unknown Company'}</span>
                    <span>•</span>
                    <span>Status: <strong className="text-slate-300 uppercase text-[10px]">{job.status}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {typeof job.match_score === 'number' && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold text-xs">
                      <Sparkles className="h-3 w-3" />
                      <span>{job.match_score}% Fit</span>
                    </div>
                  )}

                  <button
                    onClick={() => onSelectJobForTailoring(job)}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
                  >
                    Drafter & Reviewer Studio
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
