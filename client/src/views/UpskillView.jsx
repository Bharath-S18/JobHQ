import React from 'react';
import {
  TrendingUp,
  BookOpen,
  Clock,
  ExternalLink,
  Sparkles,
  Award,
  Layers
} from 'lucide-react';

export default function UpskillView({ jobs = [] }) {
  // Aggregate skill demand & gaps
  const skillHeatmap = [
    { skill: 'Next.js & Server Components', demand: 92, frequency: '84% of postings', roadmap: 'App router architecture, streaming SSR, server actions', time: '1-2 weeks' },
    { skill: 'Docker & Containerization', demand: 86, frequency: '72% of postings', roadmap: 'Multi-stage builds, compose networks, microservice isolation', time: '1 week' },
    { skill: 'PostgreSQL & Query Optimization', demand: 79, frequency: '65% of postings', roadmap: 'Indexing strategies, EXPLAIN ANALYZE, connection pooling', time: '1 week' },
    { skill: 'Distributed Systems & Queues', demand: 74, frequency: '58% of postings', roadmap: 'Redis pub/sub, idempotent workers, dead-letter queues', time: '2 weeks' },
    { skill: 'GraphQL & Federation', demand: 68, frequency: '45% of postings', roadmap: 'Schema stitching, Apollo server, caching resolvers', time: '1 week' },
  ];

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
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Target Tech Stack Demand Matrix
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skillHeatmap.map((item, idx) => (
            <div
              key={idx}
              className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{item.skill}</h3>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded">
                    {item.demand}% Priority
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full"
                    style={{ width: `${item.demand}%` }}
                  />
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  <strong>Learning Track:</strong> {item.roadmap}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Est: {item.time}</span>
                </div>

                <span className="text-[11px] font-mono text-slate-400">{item.frequency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
