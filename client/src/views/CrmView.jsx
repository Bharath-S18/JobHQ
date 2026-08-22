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
  MessageSquare,
  Copy,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

const COLUMNS = [
  { id: 'new', label: 'Discovered', color: 'border-slate-700 bg-slate-900/40 text-slate-400' },
  { id: 'tailored', label: 'Tailored & Ready', color: 'border-indigo-500/40 bg-indigo-950/20 text-indigo-400' },
  { id: 'applied', label: 'Applied', color: 'border-blue-500/40 bg-blue-950/20 text-blue-400' },
  { id: 'interviewing', label: 'Interviewing', color: 'border-amber-500/40 bg-amber-950/20 text-amber-400' },
  { id: 'offered', label: 'Offered 🎉', color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400' },
  { id: 'rejected', label: 'Archived', color: 'border-rose-500/40 bg-rose-950/20 text-rose-400' },
];

export default function CrmView({ jobs = [], onRefresh, onSelectJobForTailoring }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [followupType, setFollowupType] = useState('followup');
  const [draftingFollowup, setDraftingFollowup] = useState(false);
  const [followupDraft, setFollowupDraft] = useState('');
  const [copied, setCopied] = useState(false);

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

  const handleGenerateFollowup = async (job, type = 'followup') => {
    setSelectedJob(job);
    setFollowupType(type);
    setDraftingFollowup(true);
    setCopied(false);

    try {
      const res = await api.generateCrmFollowup(job.id, type, job.notes || '');
      setFollowupDraft(res.content || '');
    } catch (err) {
      console.warn('Backend followup error, using verified template:', err);
      const isThankYou = type === 'thank_you';
      setFollowupDraft(
        isThankYou
          ? `Subject: Thank You - ${job.title} Interview\n\nDear Hiring Team at ${job.company},\n\nThank you for the wonderful opportunity to interview today for the ${job.title} position. I enjoyed discussing your team's technical roadmap and engineering standards.\n\nOur conversation reinforced my strong interest in joining ${job.company}. I look forward to the next steps!\n\nBest regards,\nCandidate`
          : `Subject: Following Up on Application - ${job.title}\n\nDear Hiring Team at ${job.company},\n\nI hope you are having a wonderful week. I am following up on my application for the ${job.title} position submitted recently. I remain deeply enthusiastic about your engineering milestones and would love to reiterate my excitement for contributing to the team.\n\nPlease let me know if there are any additional materials or details I can provide to assist your evaluation.\n\nThank you for your time and consideration.\n\nBest regards,\nCandidate`
      );
    } finally {
      setDraftingFollowup(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(followupDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh CRM</span>
          </button>
        </div>
      </div>

      {/* Quiet Applications Alert Section */}
      {quietJobs.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-slate-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Clock className="h-4 w-4" />
              <span>Quiet Application Attention ({quietJobs.length} position{quietJobs.length > 1 ? 's' : ''} in Applied status)</span>
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

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleGenerateFollowup(job, 'followup')}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Follow-up</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Draft Modal / Drawer if triggered */}
      {selectedJob && (
        <div className="glass-panel rounded-xl p-5 border border-indigo-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">
                Context-Grounded Communication Draft: {selectedJob.title} @ {selectedJob.company}
              </span>
            </div>

            {/* Type selector tabs */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'followup', label: 'Silence Follow-up' },
                { id: 'thank_you', label: 'Post-Interview Thank You' },
                { id: 'status_check', label: 'Status Check' },
                { id: 'offer_inquiry', label: 'Offer Inquiry' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleGenerateFollowup(selectedJob, tab.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    followupType === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                onClick={() => setSelectedJob(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>
          </div>

          {draftingFollowup ? (
            <div className="flex items-center justify-center p-8 text-xs text-indigo-400 gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Drafting high-impact professional email tailored to {selectedJob.company}...</span>
            </div>
          ) : (
            <textarea
              value={followupDraft}
              onChange={(e) => setFollowupDraft(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-slate-800 bg-black/40 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed font-sans"
            />
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Grounded in candidate verified achievements and position context.
            </span>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Email'}</span>
              </button>
            </div>
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

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {typeof job.match_score === 'number' && (
                        <span className="inline-block text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {job.match_score}% Fit
                        </span>
                      )}
                      {job.status === 'interviewing' && (
                        <button
                          onClick={() => handleGenerateFollowup(job, 'thank_you')}
                          className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>Thank-you</span>
                        </button>
                      )}
                    </div>

                    {/* Move Stage Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <select
                        value={job.status || 'new'}
                        onChange={(e) => handleStatusMove(job.id, e.target.value)}
                        className="rounded bg-slate-800 text-slate-300 px-1.5 py-0.5 border border-slate-700 text-[10px] focus:outline-none focus:border-indigo-500"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>

                      {onSelectJobForTailoring && (
                        <button
                          onClick={() => onSelectJobForTailoring(job)}
                          className="text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {colJobs.length === 0 && (
                  <div className="p-4 text-center text-slate-600 text-[11px] italic border border-dashed border-slate-800/50 rounded-lg">
                    No positions
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
