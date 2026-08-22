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
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  Globe,
  Link,
  ArrowRight,
  Gauge,
  Compass,
  MapPin
} from 'lucide-react';
import { api } from '../services/api';

const AVAILABLE_PORTALS = [
  { id: 'linkedin', name: 'LinkedIn Jobs', badge: 'Live Guest Search', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { id: 'indeed', name: 'Indeed', badge: 'RSS & XML', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  { id: 'naukri', name: 'Naukri.com', badge: 'Catalog Feed', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'wellfound', name: 'Wellfound (AngelList)', badge: 'Startup Roles', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
];

export default function HunterView({
  jobs = [],
  onSelectJobForTailoring,
  onRefresh,
  onOpenNewJobModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [directUrl, setDirectUrl] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [rankingAll, setRankingAll] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Multi-Portal Scout Form State
  const [scoutQuery, setScoutQuery] = useState('Full Stack Engineer');
  const [scoutLocation, setScoutLocation] = useState('Bengaluru');
  const [selectedPortals, setSelectedPortals] = useState(['linkedin', 'indeed', 'naukri', 'wellfound']);
  const [scoutingPortals, setScoutingPortals] = useState(false);
  const [lastScoutResult, setLastScoutResult] = useState(null);

  const togglePortal = (portalId) => {
    if (selectedPortals.includes(portalId)) {
      if (selectedPortals.length > 1) {
        setSelectedPortals(selectedPortals.filter((p) => p !== portalId));
      }
    } else {
      setSelectedPortals([...selectedPortals, portalId]);
    }
  };

  const handleRunPortalScout = async (e) => {
    e.preventDefault();
    if (!scoutQuery.trim()) return;

    setScoutingPortals(true);
    setFeedback(null);
    try {
      const res = await api.scoutPortals({
        portals: selectedPortals,
        query: scoutQuery.trim(),
        location: scoutLocation.trim(),
        limit: 8,
      });

      setLastScoutResult(res);
      setFeedback({
        type: 'success',
        text: `Scout complete! Discovered ${res.totalDiscovered} positions (${res.newInserted} new) across ${selectedPortals.length} portals with 5D fit evaluated.`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Scout failed' });
    } finally {
      setScoutingPortals(false);
    }
  };

  const handleScrapeDirectUrl = async (e) => {
    e.preventDefault();
    if (!directUrl.trim()) return;

    setScrapingUrl(true);
    setFeedback(null);
    try {
      const res = await api.scrapeJobUrl(directUrl.trim());
      setDirectUrl('');
      setFeedback({
        type: 'success',
        text: `Scraped "${res.job.title}" @ ${res.job.company}. 5D Fit Score: ${res.job.match_score || 80}%`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Scraping failed' });
    } finally {
      setScrapingUrl(false);
    }
  };

  const handleRankAll = async () => {
    setRankingAll(true);
    setFeedback(null);
    try {
      const res = await api.rankAllJobs();
      setFeedback({
        type: 'success',
        text: `5-Dimension Rubric evaluated for all ${res.rankedCount} jobs in your pipeline!`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Batch ranking failed' });
    } finally {
      setRankingAll(false);
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

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      (job.title && job.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.company && job.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'linkedin' && (job.source === 'linkedin' || job.url?.includes('linkedin'))) ||
      (sourceFilter === 'indeed' && (job.source === 'indeed' || job.ats === 'indeed')) ||
      (sourceFilter === 'naukri' && (job.source === 'naukri' || job.ats === 'naukri')) ||
      (sourceFilter === 'wellfound' && (job.source === 'wellfound' || job.ats === 'wellfound')) ||
      (sourceFilter === 'greenhouse' && job.ats === 'greenhouse') ||
      (sourceFilter === 'lever' && job.ats === 'lever');

    return matchesSearch && matchesSource;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Multi-Source Hunter</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">/scrape & skills</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous multi-portal scout across LinkedIn, Indeed, Naukri, Wellfound, and direct URL parsers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRankAll}
            disabled={rankingAll || jobs.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-950/30 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-900/40 transition disabled:opacity-50"
          >
            <Gauge className={`h-3.5 w-3.5 ${rankingAll ? 'animate-spin' : ''}`} />
            <span>{rankingAll ? 'Evaluating 5D...' : 'Batch Rank 5D'}</span>
          </button>

          <button
            onClick={handleLoadSamples}
            disabled={sampleLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{sampleLoading ? 'Loading...' : 'Load Samples'}</span>
          </button>

          <button
            onClick={onOpenNewJobModal}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Manual</span>
          </button>
        </div>
      </div>

      {/* MULTI-PORTAL SCOUT COMMAND CENTER */}
      <div className="glass-panel rounded-2xl p-6 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/25 via-slate-900/70 to-purple-950/20 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Multi-Portal Live Search Scouts
            </h2>
          </div>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Concurrent Ingestion Engine
          </span>
        </div>

        {/* Portal Selection Chips */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 block">Select Active Search Portals:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AVAILABLE_PORTALS.map((portal) => {
              const isSelected = selectedPortals.includes(portal.id);
              return (
                <button
                  type="button"
                  key={portal.id}
                  onClick={() => togglePortal(portal.id)}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-500/60 bg-indigo-600/20 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">{portal.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{portal.badge}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded text-indigo-600 focus:ring-0 h-4 w-4"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Query & Location Form */}
        <form onSubmit={handleRunPortalScout} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              required
              value={scoutQuery}
              onChange={(e) => setScoutQuery(e.target.value)}
              placeholder="Target role or tech keywords (e.g. React Developer, Node.js SDE)..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4 relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={scoutLocation}
              onChange={(e) => setScoutLocation(e.target.value)}
              placeholder="Location or Work Mode (e.g. Bengaluru, Remote)..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={scoutingPortals || !scoutQuery || selectedPortals.length === 0}
              className="w-full h-full min-h-[38px] rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className={`h-3.5 w-3.5 ${scoutingPortals ? 'animate-spin' : ''}`} />
              <span>{scoutingPortals ? 'Scouting Selected...' : `Scout ${selectedPortals.length} Portals`}</span>
            </button>
          </div>
        </form>

        {/* Live Scout Telemetry Counts */}
        {lastScoutResult?.portalCounts && (
          <div className="flex items-center gap-4 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
            <span>Discovered:</span>
            {Object.entries(lastScoutResult.portalCounts).map(([portal, count]) => (
              <span key={portal} className="capitalize text-slate-300">
                {portal}: <strong className="text-indigo-400">{count}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* DIRECT URL INGESTION BAR */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-2">
        <span className="text-xs font-semibold text-slate-400 block">Single Job URL Ingestion:</span>
        <form onSubmit={handleScrapeDirectUrl} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
            <input
              type="url"
              required
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
              placeholder="Paste job posting URL (Greenhouse, Lever, LinkedIn, or direct company career link)..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={scrapingUrl || !directUrl}
            className="w-full sm:w-auto rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 shrink-0"
          >
            {scrapingUrl ? 'Scraping & Ranking...' : 'Scrape Single Link'}
          </button>
        </form>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-xs font-medium flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, company, keyword..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Filter Source:</span>
          {['all', 'linkedin', 'indeed', 'naukri', 'wellfound', 'greenhouse', 'lever'].map((source) => (
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
          <p className="text-xs text-slate-500">Run the Multi-Portal Scout above, paste a job URL, or load verified samples.</p>
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
                    {job.source || job.ats || 'Direct'}
                  </span>
                  {typeof job.match_score === 'number' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      <Sparkles className="h-3 w-3" />
                      {job.match_score}% Fit
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition leading-snug line-clamp-2">
                  {job.title}
                </h3>
                
                <p className="text-xs font-medium text-slate-300">
                  {job.company || 'Company'} {job.location ? `• ${job.location}` : ''}
                </p>

                {job.match_reason && (
                  <p className="text-xs text-indigo-300/80 line-clamp-2 leading-relaxed bg-indigo-950/20 p-2 rounded-lg border border-indigo-500/10">
                    {job.match_reason}
                  </p>
                )}

                {job.description && !job.match_reason && (
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
