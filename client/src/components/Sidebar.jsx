import React from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Crosshair,
  Gauge,
  FileCheck2,
  KanbanSquare,
  Mic,
  TrendingUp,
  Settings,
  Sparkles,
  Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'profile', label: 'Profile Studio', icon: UserCheck, badge: '/setup' },
  { id: 'hunter', label: 'Multi-Source Hunter', icon: Crosshair, badge: '/scrape' },
  { id: 'rank', label: '5D Fit Matrix', icon: Gauge, badge: '/rank' },
  { id: 'tailor', label: 'Drafter & Reviewer', icon: FileCheck2, badge: '/apply' },
  { id: 'crm', label: 'Pipeline CRM', icon: KanbanSquare, badge: '/outcome' },
  { id: 'interview', label: 'Interview Prep Hub', icon: Mic, badge: '/interview' },
  { id: 'upskill', label: 'Upskill Heatmap', icon: TrendingUp, badge: '/upskill' },
];

export default function Sidebar({ activeTab, onSelectTab }) {
  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#090a0f] flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="p-4 space-y-1">
        
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Agent Workflow Engine
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                      : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900/40 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-white">Local-First Agent</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your career documents & credentials remain 100% private in local SQLite storage.
          </p>
        </div>
      </div>
    </aside>
  );
}
