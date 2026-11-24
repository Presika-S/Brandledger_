import React from 'react';
import { 
  ShieldCheck, BookOpen, RefreshCw, Terminal, Eye, History, 
  ArrowRight, CheckCircle2, AlertTriangle, Sparkles, Layers, 
  FileText, Database, ShieldAlert, Cpu, Globe
} from 'lucide-react';

export default function HomePage({ onNavigate, trustScore }) {
  const features = [
    {
      id: 'verify',
      title: 'Draft Guard Studio',
      description: 'Splits any draft into individual claims (numbers, SLAs, dates, promises) with exact character spans and verifies each against approved facts.',
      icon: ShieldCheck,
      badge: 'Live Pre-Publish Check',
      color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400'
    },
    {
      id: 'ledger',
      title: 'Brand Source of Truth Ledger',
      description: 'Versioned brand facts in PostgreSQL. Every fact has a designated human owner, source cite, expiry date, and immutable version history.',
      icon: BookOpen,
      badge: 'pgvector Semantic Search',
      color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400'
    },
    {
      id: 'reverse',
      title: 'Reverse Check Engine',
      description: 'When a fact is updated or expires in the ledger, the reverse check automatically identifies live published assets with old claims and flags them.',
      icon: RefreshCw,
      badge: 'Automated Freshness Audit',
      color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400'
    },
    {
      id: 'guard_api',
      title: '/guard API & Browser Extension',
      description: 'Empower AI tools, content writers, and copywriters to verify claims before publishing directly from Google Docs, ChatGPT, or automated CI/CD pipelines.',
      icon: Terminal,
      badge: 'Chrome V3 & REST API',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
    }
  ];

  const pipelineStages = [
    {
      step: '01',
      title: 'Claim Extraction',
      desc: 'Tokenizes draft text into typed claims (NUMERIC, PROMISE, DATE, GLOSSARY) with precise character start/end positions.'
    },
    {
      step: '02',
      title: 'Exact Rules Engine',
      desc: 'Deterministic checks on pricing, uptime percentages, certification dates, and trademark spelling run first for zero-latency accuracy.'
    },
    {
      step: '03',
      title: 'pgvector Semantic Retrieval',
      desc: 'Retrieves ONLY approved, unexpired facts from PostgreSQL filtered by current date and visibility permissions.'
    },
    {
      step: '04',
      title: 'Cite-or-Abstain LLM Contract',
      desc: 'Judges one claim at a time. The verifier MUST return an approved source ID and direct quote, or safely abstain and route to a human.'
    },
    {
      step: '05',
      title: 'Reverse Dependency Check',
      desc: 'Publishes assets with cryptographic links to fact versions. When any fact changes, the engine flags stale published content automatically.'
    }
  ];

  return (
    <div className="space-y-10 pb-12">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden p-8 md:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 shadow-2xl">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <Sparkles size={14} />
            <span>Pre-Publish Claim Verification & Governance Platform</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Stop Wrong Claims <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400">
              Before They Go Live.
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
            Organizations publish through employees, agencies, and AI tools simultaneously. 
            <b> BrandLedger</b> verifies numbers, prices, SLAs, and promises against an immutable 
            Source of Truth with human-in-the-loop governance and automated reverse checks.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate('verify')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition shadow-lg shadow-sky-600/25"
            >
              <span>Launch Draft Guard Studio</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => onNavigate('ledger')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
            >
              <BookOpen size={16} />
              <span>Explore Fact Ledger</span>
            </button>
          </div>
        </div>

        {/* Floating Governance Badge */}
        <div className="hidden lg:flex flex-col gap-2 absolute top-8 right-8 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md w-64 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Live Governance Index</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {trustScore}% Trust
          </div>
          <div className="text-[11px] text-slate-400 leading-tight">
            Continuous verification against active brand policies and fact owners.
          </div>
        </div>
      </div>

      {/* Feature Navigation Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers size={18} className="text-sky-400" />
            Core Governance Modules
          </h2>
          <span className="text-xs text-slate-400">Click any module to launch</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={() => onNavigate(feat.id)}
                className={`p-6 rounded-2xl bg-gradient-to-br ${feat.color} bg-slate-900/90 border hover:border-slate-600 transition cursor-pointer flex flex-col justify-between shadow-lg group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-white group-hover:scale-105 transition">
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-sky-300 transition flex items-center gap-1.5">
                    {feat.title}
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-transform transform group-hover:translate-x-1" />
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Open Module</span>
                  <span className="text-sky-400 group-hover:underline">Launch →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-Stage Verification Pipeline (Vertical Sequence) */}
      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu size={18} className="text-indigo-400" />
            The 5-Stage Claim Verification Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            How BrandLedger guarantees factual accuracy without hallucinating or guessing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {pipelineStages.map((stage) => (
            <div key={stage.step} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {stage.step}
                </span>
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 mb-1">
                  {stage.title}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {stage.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust & Guarantee Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <CheckCircle2 size={16} />
            <span>Cite-or-Abstain Contract</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            If the system is unsure or an approved fact is missing, it strictly abstains and routes the claim to the fact owner instead of hallucinating.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <RefreshCw size={16} />
            <span>Automated Reverse Checks</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            When a fact changes, BrandLedger traces all published items using the old version and sends them back to review with remediation alerts.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <ShieldCheck size={16} />
            <span>On-Premise Privacy</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Text extraction, embeddings, and Tesseract/OpenCV OCR run on private infrastructure. Brand assets never leak to public model training.
          </p>
        </div>
      </div>

    </div>
  );
}
