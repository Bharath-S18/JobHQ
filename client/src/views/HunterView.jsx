import React, { useState } from 'react';
import {
  Crosshair,
  Search,
  Plus,
  Play,
  Layers,
  Sparkles,
  ExternalLink,
  Trash2,
  Filter,
  CheckCircle,
  FileCheck2,
  RefreshCw,
  Globe
} from 'lucide-react';
import { api } from '../services/api';

export default function HunterView({
  jobs = [],
  onSelectJobForTailoring,
  onRefresh,
  onOpenNewJobModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [hunting, setHunting] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      (job.title && job.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.company && job.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'greenhouse' && job.ats === 'greenhouse') ||
      (sourceFilter === 'lever' && job.ats === 'lever') ||
      (sourceFilter === 'linkedin' && (job.url?.includes('linkedin') || !job.ats));

    return matchesSearch && matchesSource;
  });

  const handleRunScout = async () => {
    setHunting(true);
    try {
      await api.runHunter();
      setTimeout(async () => {
        setHunting(false);
        if (onRefresh) onRefresh();
      }, 2500);
    } catch (err) {
      setHunting(false);
      alert('Hunter Scout error: ' + err.message);
    }
  };

  const handleLoadSamples = async () => {
    setSampleLoading(true);
    try {
      await api.loadSampleJobs();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to load sample jobs: ' + err.message);
    } finally {
      setSampleLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      await api.deleteJob(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to delete job: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Multi-Source Hunter</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">/scrape</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Scout live postings across Greenhouse, Lever, LinkedIn alerts, and direct URL imports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleLoadSamples}
            disabled={sampleLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{sampleLoading ? 'Loading...' : 'Load Verified Samples'}</span>
          </button>

          <button
            onClick={onOpenNewJobModal}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Single URL</span>
          </button>

          <button
            onClick={handleRunScout}
            disabled={hunting}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 ${hunting ? 'animate-spin' : ''}`} />
            <span>{hunting ? 'Scouting Portals...' : 'Run Autonomous Scout'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, company, or keyword..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Portal:</span>
          {['all', 'greenhouse', 'lever', 'linkedin'].map((source) => (
            <button
              key={source}
              onClick={() => setSourceFilter(source)}
              className={`rounded-lg px-2.5 py-1 text-xs capitalize transition ${
                sourceFilter === source
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {source}
            </button>
          ))}
        </div>

      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center space-y-3">
          <p className="text-sm text-slate-400">No postings matching the selected filters.</p>
          <p className="text-xs text-slate-500">Click "Run Autonomous Scout" or "Add Single URL" to import positions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="glass-panel glass-panel-hover rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4 transition group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                    {job.ats || 'Standard'}
                  </span>
                  {typeof job.match_score === 'number' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      <Sparkles className="h-3 w-3" />
                      {job.match_score}%
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition leading-snug line-clamp-2">
                  {job.title}
                </h3>
                
                <p className="text-xs font-medium text-slate-300">
                  {job.company || 'Unknown Company'}
                </p>

                {job.description && (
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Status: <strong className="text-slate-300 uppercase text-[10px]">{job.status}</strong></span>
                  {job.url && (
                    <a
                      href={job.final_url || job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white transition"
                      title="Open live posting"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectJobForTailoring(job)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" />
                    <span>Drafter & Reviewer</span>
                  </button>

                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition"
                    title="Remove job"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
