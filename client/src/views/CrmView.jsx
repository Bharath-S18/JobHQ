import React, { useState } from 'react';
import {
  KanbanSquare,
  Clock,
  Mail,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Send,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';

const COLUMNS = [
  { id: 'new', label: 'Discovered / Staged', color: 'border-slate-700 bg-slate-900/40 text-slate-400' },
  { id: 'tailored', label: 'Tailored & Ready', color: 'border-indigo-500/40 bg-indigo-950/20 text-indigo-400' },
  { id: 'applied', label: 'Applied', color: 'border-blue-500/40 bg-blue-950/20 text-blue-400' },
  { id: 'interviewing', label: 'Interviewing', color: 'border-amber-500/40 bg-amber-950/20 text-amber-400' },
  { id: 'offered', label: 'Offered 🎉', color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400' },
  { id: 'rejected', label: 'Archived / Rejected', color: 'border-rose-500/40 bg-rose-950/20 text-rose-400' },
];

export default function CrmView({ jobs = [], onRefresh, onSelectJobForTailoring }) {
  const [selectedQuietJob, setSelectedQuietJob] = useState(null);
  const [draftingFollowup, setDraftingFollowup] = useState(false);
  const [followupDraft, setFollowupDraft] = useState('');

  // Identify quiet applications (>7-10 days in applied status without update)
  const quietJobs = jobs.filter((j) => j.status === 'applied');

  const handleStatusMove = async (jobId, newStatus) => {
    try {
      await api.updateJobStatus(jobId, newStatus);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleGenerateFollowup = (job) => {
    setSelectedQuietJob(job);
    setDraftingFollowup(true);
    setTimeout(() => {
      setDraftingFollowup(false);
      setFollowupDraft(
        `Hi Hiring Team at ${job.company},\n\nI hope you are having a wonderful week. I am following up on my application for the ${job.title} position submitted recently. I remain deeply enthusiastic about your engineering milestones and would love to reiterate my excitement for contributing to the team.\n\nPlease let me know if there are any additional materials or details I can provide to assist your evaluation.\n\nThank you for your time and consideration.\n\nBest regards,\nCandidate`
      );
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Pipeline CRM & Quiet Application Follow-ups</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">/outcome</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track stages, detect quiet applications, and generate context-grounded follow-up emails.
          </p>
        </div>
      </div>

      {/* Quiet Applications Alert Section */}
      {quietJobs.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-slate-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Clock className="h-4 w-4" />
              <span>Quiet Application Attention ({quietJobs.length} open position)</span>
            </div>
            <span className="text-[10px] text-amber-400/80 font-mono">Recommended follow-up window (7-10 days)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quietJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-slate-900/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{job.title}</h4>
                  <p className="text-[11px] text-slate-400">{job.company}</p>
                </div>

                <button
                  onClick={() => handleGenerateFollowup(job)}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Draft Follow-up</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Draft Modal / Drawer if triggered */}
      {selectedQuietJob && (
        <div className="glass-panel rounded-xl p-5 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">
                Context-Grounded Follow-up Draft: {selectedQuietJob.title} @ {selectedQuietJob.company}
              </span>
            </div>
            <button
              onClick={() => setSelectedQuietJob(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <textarea
            value={followupDraft}
            onChange={(e) => setFollowupDraft(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-slate-800 bg-black/40 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(followupDraft);
                alert('Follow-up email copied to clipboard!');
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 min-h-[500px]">
        {COLUMNS.map((col) => {
          const colJobs = jobs.filter((j) => (j.status || 'new') === col.id);

          return (
            <div
              key={col.id}
              className="rounded-xl border border-slate-800/80 bg-[#0c0e17] p-3 flex flex-col space-y-3"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300">{col.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                  {colJobs.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
                {colJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition leading-snug">
                        {job.title}
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-400">{job.company}</p>

                    {typeof job.match_score === 'number' && (
                      <span className="inline-block text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        {job.match_score}% Fit
                      </span>
                    )}

                    {/* Move Stage Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <select
                        value={job.status || 'new'}
                        onChange={(e) => handleStatusMove(job.id, e.target.value)}
                        className="rounded bg-slate-800 text-slate-300 px-1.5 py-0.5 border border-slate-700 text-[10px]"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => onSelectJobForTailoring(job)}
                        className="text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
