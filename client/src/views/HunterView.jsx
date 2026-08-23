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
  MapPin,
  XCircle,
  Scissors,
  Check,
  Building2,
  AlertCircle,
  ArrowUpDown,
  Clock
} from 'lucide-react';
import { api } from '../services/api';

const AVAILABLE_PORTALS = [
  { id: 'linkedin', name: 'LinkedIn Jobs', badge: 'Live Guest Search', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { id: 'indeed', name: 'Indeed', badge: 'RSS & Developer Feeds', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  { id: 'naukri', name: 'Naukri.com', badge: 'Catalog & Schema', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'wellfound', name: 'Wellfound (AngelList)', badge: 'Startup Roles & API', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
];

export default function HunterView({
  jobs = [],
  onSelectJobForTailoring,
  onRefresh,
  onOpenNewJobModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'score'
  const [directUrl, setDirectUrl] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [rankingAll, setRankingAll] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [latestScrapedJob, setLatestScrapedJob] = useState(null);

  // Multi-Portal Scout Form State
  const [scoutQuery, setScoutQuery] = useState('Full Stack Engineer');
  const [scoutLocation, setScoutLocation] = useState('Bengaluru');
  const [selectedPortals, setSelectedPortals] = useState(['linkedin', 'indeed', 'naukri', 'wellfound']);
  const [scoutingPortals, setScoutingPortals] = useState(false);

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

      setFeedback({
        type: 'success',
        text: `Scout complete! Discovered ${res.totalDiscovered} positions (${res.newInserted} new) across ${selectedPortals.length} portals.`,
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
    setLatestScrapedJob(null);
    try {
      const res = await api.scrapeJobUrl(directUrl.trim());
      const job = res.job || res;
      setDirectUrl('');
      setLatestScrapedJob(job);
      setFeedback({
        type: 'success',
        text: `Successfully scraped "${job.title}" at ${job.company || 'Company'}!`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Scraping failed' });
    } finally {
      setScrapingUrl(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    setCleaningDuplicates(true);
    setFeedback(null);
    try {
      const res = await api.cleanupDuplicates();
      setFeedback({
        type: 'success',
        text: `Deduplication complete: Removed ${res.removedCount} duplicate postings and normalized ${res.updatedSources} sources.`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Deduplication failed' });
    } finally {
      setCleaningDuplicates(false);
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
      if (latestScrapedJob?.id === id) setLatestScrapedJob(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to delete job: ' + err.message);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchTerm.trim() ||
      (job.title && job.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.company && job.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const src = (job.source || job.ats || '').toLowerCase();
    const isSupersetJob = src === 'superset' || (job.url || '').includes('joinsuperset.com');
    const isLinkedInAlertJob = src === 'linkedin_alert' || (src.includes('gmail') && (job.url || '').includes('linkedin.com'));

    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'superset' && isSupersetJob) ||
      (sourceFilter === 'linkedin_alert' && isLinkedInAlertJob) ||
      (sourceFilter === 'linkedin' && !isLinkedInAlertJob && (src === 'linkedin' || (job.url || '').includes('linkedin.com'))) ||
      (sourceFilter === 'indeed' && (src.includes('indeed') || (job.url || '').includes('indeed') || (job.url || '').includes('weworkremotely'))) ||
      (sourceFilter === 'naukri' && (src.includes('naukri') || (job.url || '').includes('naukri'))) ||
      (sourceFilter === 'wellfound' && (src.includes('wellfound') || src.includes('angel') || (job.url || '').includes('wellfound'))) ||
      (sourceFilter === 'greenhouse' && (src.includes('greenhouse') || (job.url || '').includes('greenhouse'))) ||
      (sourceFilter === 'lever' && (src.includes('lever') || (job.url || '').includes('lever')));

    return matchesSearch && matchesSource;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'score') {
      return (b.match_score || 0) - (a.match_score || 0);
    }
    // Default: Newest first by received_at / created_at, then highest ID
    const timeA = new Date(a.received_at || a.created_at || 0).getTime();
    const timeB = new Date(b.received_at || b.created_at || 0).getTime();
    return timeB - timeA || b.id - a.id;
  });

  const getSourceBadgeInfo = (job) => {
    const s = (job.source || job.ats || '').toLowerCase();
    const u = (job.url || '').toLowerCase();

    if (s === 'superset' || u.includes('joinsuperset.com')) {
      return { label: '🎓 Campus (Superset)', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    if (s === 'linkedin_alert' || (s.includes('gmail') && u.includes('linkedin.com'))) {
      return { label: '📬 LinkedIn Alert', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-semibold' };
    }
    if (s === 'linkedin' || u.includes('linkedin.com')) {
      return { label: '🌐 LinkedIn Guest', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    }
    if (s.includes('indeed') || u.includes('indeed') || u.includes('weworkremotely')) {
      return { label: 'Indeed', cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
    }
    if (s.includes('naukri') || u.includes('naukri')) {
      return { label: 'Naukri', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    }
    if (s.includes('wellfound') || s.includes('angel') || u.includes('wellfound')) {
      return { label: 'Wellfound', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
    }
    if (s.includes('greenhouse') || u.includes('greenhouse')) {
      return { label: 'Greenhouse', cls: 'text-teal-400 bg-teal-500/10 border-teal-500/20' };
    }
    if (s.includes('lever') || u.includes('lever')) {
      return { label: 'Lever', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }
    return { label: 'Direct Scraped', cls: 'text-slate-400 bg-slate-800 border-slate-700' };
  };

  const isDeadlineExpired = (deadlineStr) => {
    if (!deadlineStr) return false;
    try {
      const currentYear = new Date().getFullYear();
      let clean = deadlineStr.replace(/^(?:new\s+deadline|deadline|apply\s+before|last\s+date\s*(?:to\s*apply)?)\s*:?\s*/i, '').trim();
      if (!/\b(202\d)\b/.test(clean)) {
        clean = `${clean}, ${currentYear}`;
      }
      const parsed = Date.parse(clean);
      if (!isNaN(parsed)) {
        return parsed < Date.now();
      }
    } catch (e) {}
    return false;
  };

  const getStatusBadge = (status) => {
    const s = (status || 'new').toLowerCase();
    if (s === 'applied') return { label: 'APPLIED', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (s === 'tailored') return { label: 'TAILORED', cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    if (s === 'interviewing') return { label: 'INTERVIEWING', cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    if (s === 'offered') return { label: 'OFFERED', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
    if (s === 'closed') return { label: 'CLOSED', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    return { label: 'NEW', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Multi-Source Hunter</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">Public Scrapers</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Discover positions across LinkedIn, Indeed, Naukri, Wellfound, and direct URL parsers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCleanupDuplicates}
            disabled={cleaningDuplicates || jobs.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition disabled:opacity-50"
            title="Clean duplicate postings"
          >
            <Scissors className={`h-3.5 w-3.5 ${cleaningDuplicates ? 'animate-spin' : ''}`} />
            <span>{cleaningDuplicates ? 'Deduplicating...' : 'Deduplicate'}</span>
          </button>

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
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
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
              Multi-Portal Public Search Scouts
            </h2>
          </div>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Lightweight Public Ingestion
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
                  <div className={`h-4 w-4 rounded flex items-center justify-center border ${
                    isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-800'
                  }`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Parameters Form */}
        <form onSubmit={handleRunPortalScout} className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Role / Keywords</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={scoutQuery}
                onChange={(e) => setScoutQuery(e.target.value)}
                placeholder="e.g. Full Stack Engineer, React"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Location / Remote</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={scoutLocation}
                onChange={(e) => setScoutLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Remote, India"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={scoutingPortals || !scoutQuery.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-purple-500 transition disabled:opacity-50"
            >
              <Compass className={`h-4 w-4 ${scoutingPortals ? 'animate-spin' : ''}`} />
              <span>{scoutingPortals ? 'Scouting Selected Portals...' : 'Scout All Portals'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* DIRECT JOB URL PARSER */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 bg-slate-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Direct Job URL Scraper (/apply &lt;url&gt;)</h2>
          </div>
          <span className="text-xs text-slate-400">Greenhouse, Lever, LinkedIn, Indeed, etc.</span>
        </div>

        <form onSubmit={handleScrapeDirectUrl} className="flex gap-2">
          <input
            type="url"
            value={directUrl}
            onChange={(e) => setDirectUrl(e.target.value)}
            placeholder="Paste any public job URL (e.g. https://boards.greenhouse.io/... or LinkedIn job link)"
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={scrapingUrl || !directUrl.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 transition disabled:opacity-50 shadow-md shadow-purple-600/20 shrink-0"
          >
            <Globe className={`h-3.5 w-3.5 ${scrapingUrl ? 'animate-spin' : ''}`} />
            <span>{scrapingUrl ? 'Extracting...' : 'Scrape & Ingest'}</span>
          </button>
        </form>

        {/* PROMINENT LATEST SCRAPED JOB PREVIEW CARD */}
        {latestScrapedJob && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-semibold uppercase">
                    Scraped Just Now
                  </span>
                  {(() => {
                    const b = getSourceBadgeInfo(latestScrapedJob);
                    return (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${b.cls}`}>
                        {b.label}
                      </span>
                    );
                  })()}
                  {typeof latestScrapedJob.match_score === 'number' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      {latestScrapedJob.match_score}% Fit
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white">{latestScrapedJob.title}</h3>
                <p className="text-xs text-slate-300">
                  {latestScrapedJob.company || 'Company'} {latestScrapedJob.location ? `• ${latestScrapedJob.location}` : ''}
                </p>
              </div>

              <button
                onClick={() => setLatestScrapedJob(null)}
                className="text-slate-400 hover:text-slate-200 transition p-1"
                title="Dismiss"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            {latestScrapedJob.description && (
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                {latestScrapedJob.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Ready for AI Drafter & Reviewer tailoring:
              </span>
              <button
                onClick={() => onSelectJobForTailoring(latestScrapedJob)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                <span>Draft Application with AI</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter, Sort & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, company, keyword..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 text-indigo-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="newest">🕒 Latest First</option>
              <option value="score">✨ Highest Fit %</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start lg:self-auto flex-wrap">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 mr-1">Filter:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'superset', label: '🎓 Campus (Superset)' },
            { id: 'linkedin_alert', label: '📬 LinkedIn Alerts' },
            { id: 'linkedin', label: '🌐 Public LinkedIn' },
            { id: 'indeed', label: 'Indeed' },
            { id: 'naukri', label: 'Naukri' },
            { id: 'wellfound', label: 'Wellfound' },
            { id: 'greenhouse', label: 'Greenhouse' },
            { id: 'lever', label: 'Lever' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSourceFilter(item.id)}
              className={`rounded-lg px-2.5 py-1 text-xs transition ${
                sourceFilter === item.id
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      {sortedJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center space-y-3">
          <p className="text-sm text-slate-400">No postings matching the selected filters.</p>
          <p className="text-xs text-slate-500">Run the Multi-Portal Scout above, paste a job URL, or load verified samples.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedJobs.map((job) => {
            const statusInfo = getStatusBadge(job.status || job.app_status);
            const sourceBadge = getSourceBadgeInfo(job);
            return (
              <div
                key={job.id}
                className="glass-panel glass-panel-hover rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4 transition group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${sourceBadge.cls}`}>
                        {sourceBadge.label}
                      </span>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                      {(() => {
                        const expired = isDeadlineExpired(job.deadline) || job.is_active === 0 || job.status === 'closed';
                        if (expired) {
                          return (
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 font-semibold">
                              <AlertCircle className="h-2.5 w-2.5 text-rose-400" />
                              <span>{job.deadline ? `Deadline Passed (${job.deadline})` : 'Closed'}</span>
                            </span>
                          );
                        }
                        return (
                          <>
                            {job.deadline && (
                              <span className="flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                                <Clock className="h-2.5 w-2.5 text-amber-400" />
                                <span>Deadline: {job.deadline}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Actively Hiring
                            </span>
                          </>
                        );
                      })()}
                    </div>

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
                    <span className="text-[11px]">
                      Discovered: <strong className="text-slate-300 font-normal">{new Date(job.created_at || Date.now()).toLocaleDateString()}</strong>
                    </span>
                    {job.url && (
                      <a
                        href={job.final_url || job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white transition flex items-center gap-1"
                        title="Open live posting"
                      >
                        <span className="text-[10px]">Open Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectJobForTailoring(job)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
                    >
                      <FileCheck2 className="h-3.5 w-3.5" />
                      <span>{job.status === 'tailored' ? 'View Tailored' : 'Drafter & Reviewer'}</span>
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
            );
          })}
        </div>
      )}

    </div>
  );
}
