import React from 'react';
import { 
  Home, ShieldCheck, BookOpen, RefreshCw, Terminal, 
  Eye, History, Sparkles, Layers, Shield, Inbox
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, trustScore, inboxCount = 0, onOpenOCR, onOpenAudit }) {
  const navItems = [
    { id: 'home', label: 'Home Overview', icon: Home, badge: null },
    { id: 'verify', label: 'Draft Guard Studio', icon: ShieldCheck, badge: 'Pre-Publish' },
    { id: 'inbox', label: 'Fact Owner Inbox', icon: Inbox, badge: inboxCount > 0 ? String(inboxCount) : null, hot: inboxCount > 0 },
    { id: 'ledger', label: 'Source of Truth Ledger', icon: BookOpen, badge: 'pgvector' },
    { id: 'reverse', label: 'Reverse Check Engine', icon: RefreshCw, badge: 'Live Alerts' },
    { id: 'guard_api', label: '/guard API Tester', icon: Terminal, badge: 'AI Guard' }
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-screen sticky top-0 p-4">
      
      {/* Top Branding */}
      <div className="space-y-6">
        
        {/* Brand Logo & Title */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-black text-xl group-hover:scale-105 transition">
            BL
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              BrandLedger
            </h1>
            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
              Pre-Publish Governance
            </span>
          </div>
        </div>

        {/* Live Governance Trust Pill */}
        <div className={`p-3 rounded-xl border flex items-center justify-between ${getScoreColor(trustScore)}`}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} />
            <span className="text-xs font-semibold">Trust Index</span>
          </div>
          <span className="text-sm font-black font-mono">{trustScore}%</span>
        </div>

        {/* Main Vertical Navigation */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Main Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                    item.hot ? 'bg-amber-500 text-slate-950 font-bold' : isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Verification Tools Section */}
        <div className="space-y-1 pt-4 border-t border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Governance Tools
          </div>

          <button
            onClick={onOpenOCR}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-left"
          >
            <Eye size={16} className="text-sky-400" />
            <span>Image OCR Verification</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-left"
          >
            <History size={16} className="text-indigo-400" />
            <span>Governance Audit Trail</span>
          </button>
        </div>

      </div>

      {/* Sidebar Footer: System Status */}
      <div className="pt-4 border-t border-slate-800 text-[11px] space-y-1 text-slate-400">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Core Engines Online</span>
        </div>
        <div className="text-[10px] text-slate-500 leading-tight">
          pgvector • Exact Rules • Cite-or-Abstain
        </div>
      </div>

    </aside>
  );
}
