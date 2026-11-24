import React from 'react';
import { ShieldCheck, BookOpen, RefreshCw, Terminal, Eye, History, FileText } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, trustScore, onOpenAudit, onOpenOCR }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const navItems = [
    { id: 'verify', label: 'Draft Guard Studio', icon: ShieldCheck, badge: null },
    { id: 'ledger', label: 'Source of Truth Ledger', icon: BookOpen, badge: 'pgvector' },
    { id: 'reverse', label: 'Reverse Check Engine', icon: RefreshCw, badge: 'Live Alerts' },
    { id: 'guard_api', label: '/guard API Tester', icon: Terminal, badge: 'AI Guard' }
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-black text-xl">
            BL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                BrandLedger
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Pre-Publish Governance
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Claim Extraction • pgvector Fact Ledger • Cite-or-Abstain • Reverse Check
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenOCR}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Extract and verify claims from images/banners via Tesseract & OpenCV"
          >
            <Eye size={13} className="text-sky-400" />
            <span>Image OCR</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Inspect governance decision history and override justifications"
          >
            <History size={13} className="text-indigo-400" />
            <span>Audit Trail</span>
          </button>

          {/* Trust Score Gauge Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold ${getScoreColor(trustScore)}`}>
            <ShieldCheck size={14} />
            <span>Trust: {trustScore}%</span>
          </div>
        </div>

      </div>
    </header>
  );
}
