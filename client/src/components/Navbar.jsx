import React from 'react';
import { 
  Sparkles, 
  Mail, 
  Bot, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Search,
  Plus,
  LogOut
} from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({ 
  authStatus, 
  hunterStatus, 
  stats, 
  onRefresh, 
  onOpenNewJobModal,
  loading 
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0c0e17]/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        
        {/* Brand Logo & Badges */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">JobHQ</span>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                PRO 2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous AI Job Search & Career System</p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Tracked:</span>
            <span className="font-semibold text-white">{stats.total || 0}</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Tailored:</span>
            <span className="font-semibold text-indigo-400">{stats.tailored || 0}</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Interviewing:</span>
            <span className="font-semibold text-emerald-400">{stats.interviewing || 0}</span>
          </div>
        </div>

        {/* Status Integrations & Actions */}
        <div className="flex items-center gap-3">
          
          {/* Gmail Status & Logout */}
          {authStatus?.connected ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{authStatus.user?.email || 'Gmail Synced'}</span>
              </div>
              <button
                onClick={async () => {
                  try {
                    await api.logout();
                    if (onRefresh) onRefresh();
                  } catch (e) {
                    alert('Logout error: ' + e.message);
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:border-red-500/30 transition"
                title="Disconnect Google / Logout"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden md:inline">Disconnect</span>
              </button>
            </div>
          ) : (
            <a
              href="/auth/google"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:bg-slate-700 transition"
            >
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>Connect Gmail</span>
            </a>
          )}

          {/* Quick Action: New Job */}
          <button
            onClick={onOpenNewJobModal}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Job</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
            title="Refresh pipeline"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>
    </header>
  );
}
