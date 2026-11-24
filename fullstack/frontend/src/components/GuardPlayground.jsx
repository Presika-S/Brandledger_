import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, Sparkles, Code2 } from 'lucide-react';
import { verifyDraft } from '../api';

export default function GuardPlayground() {
  const [jsonInput, setJsonInput] = useState(JSON.stringify({
    title: "AI Agent Outbound Campaign",
    content: "BrandLedger Enterprise Cloud starts at $99 per month billed annually, offering guaranteed 99.99% uptime SLA.",
    author: "Claude / GPT-4 Marketing Bot",
    channel: "Outbound API"
  }, null, 2));

  const [jsonOutput, setJsonOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const res = await verifyDraft(parsed.content, parsed.title);
      setJsonOutput(res);
    } catch (err) {
      alert("Invalid JSON or server error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCurl = () => {
    const curl = `curl -X POST http://localhost:8000/api/v1/guard \\
  -H "Content-Type: application/json" \\
  -d '${jsonInput.replace(/\n/g, '')}'`;
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="text-sky-400" size={20} />
            /guard API Developer Test Bench
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            The external endpoint integrated by AI agent workflows (LangChain, LlamaIndex, AutoGPT) and browser extensions before publishing or sending marketing copy.
          </p>
        </div>

        <button
          onClick={copyCurl}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? 'Copied cURL!' : 'Copy cURL Command'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Request JSON Editor */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Code2 size={13} className="text-sky-400" />
                POST /api/v1/guard (Request Payload)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">application/json</span>
            </div>
            <textarea
              rows={16}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-sky-300 outline-none focus:border-sky-500 leading-relaxed resize-none"
            />
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-lg shadow-sky-600/20 disabled:opacity-50"
          >
            <Play size={13} />
            <span>{loading ? 'Executing Pipeline...' : 'Send Request to /guard'}</span>
          </button>
        </div>

        {/* Response JSON Inspector */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Response (Status 200 OK)
            </span>
            {jsonOutput && (
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                Trust Score: {jsonOutput.trust_score}%
              </span>
            )}
          </div>

          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-emerald-300 overflow-auto h-[400px] leading-relaxed">
            {jsonOutput 
              ? JSON.stringify(jsonOutput, null, 2)
              : '// Click "Send Request to /guard" to view real-time API response.'}
          </pre>
        </div>

      </div>

    </div>
  );
}
