import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, ExternalLink, ArrowRight, ShieldAlert, Sparkles, Send } from 'lucide-react';
import { getReverseCheckAlerts, getPublishedAssets } from '../api';

export default function ReverseCheckView() {
  const [alerts, setAlerts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsData, assetsData] = await Promise.all([
        getReverseCheckAlerts(),
        getPublishedAssets()
      ]);
      setAlerts(alertsData);
      setAssets(assetsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunScan = async () => {
    setScanning(true);
    try {
      await fetchData();
      alert('Reverse check completed across all published registry assets.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Reverse Check Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
            </span>
            <h2 className="text-lg font-bold text-white">
              Reverse Check Engine & Published Claims Registry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            When an approved fact, SLA, or price changes in the Brand Source of Truth, the reverse check automatically crawls all previously published content, flags stale claims, and transitions the asset status to <b>REQUIRES_UPDATE</b>.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
        >
          <Sparkles size={14} />
          <span>{scanning ? 'Auditing Registry...' : 'Run Reverse Audit Scan'}</span>
        </button>
      </div>

      {/* Stale Content Alerts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Active Stale Content Alerts ({alerts.length})
          </h3>
          <span className="text-xs text-slate-400">
            {alerts.length === 0 ? 'All published content is compliant with current facts' : 'Requires immediate editorial remediation'}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
            Checking reverse dependencies...
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-300 bg-slate-900/60 rounded-xl border border-emerald-500/20 flex flex-col items-center gap-2">
            <CheckCircle className="text-emerald-400" size={32} />
            <div className="font-semibold text-sm">No Outdated Claims Detected</div>
            <div className="text-xs text-slate-400 max-w-md">
              All live published assets are synchronized with the latest version of the Brand Source of Truth.
            </div>
            <div className="text-[11px] text-sky-400 mt-2 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
              Tip: Go to the "Source of Truth Ledger" tab, edit a fact, and return here to watch the Reverse Check alert fire instantly!
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-rose-950/30 border border-rose-500/40 shadow-lg space-y-3 glow-flagged"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                      Stale Claim Detected
                    </span>
                    <span className="font-bold text-sm text-white">
                      {alert.asset_title}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      [{alert.channel}]
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-300">
                    Fact Version: <b className="text-rose-400">v{alert.old_version_used}</b> → <b className="text-emerald-400">v{alert.current_version} (Current)</b>
                  </div>
                </div>

                {/* Conflict Detail */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block mb-1 font-semibold">Outdated Claim in Published Asset:</span>
                    <span className="text-rose-300 font-mono font-medium">"{alert.outdated_claim_text}"</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block mb-1 font-semibold">Current Verified Truth in Ledger:</span>
                    <span className="text-emerald-300 font-medium">"{alert.fact_statement}"</span>
                  </div>
                </div>

                {/* Recommended Remediation Action */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-300">
                    <span className="font-semibold text-sky-400">Remediation: </span>
                    {alert.recommended_action}
                  </div>
                  <button
                    onClick={() => alert(`Update notification dispatched to author for asset '${alert.asset_title}'.`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                  >
                    <Send size={12} />
                    <span>Send to Author</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Published Assets Registry Table */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200">
          Published Assets Registry ({assets.length} items registered)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Asset Title</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Linked Fact Versions</th>
                <th className="py-2.5 px-3">Published Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-semibold text-white">
                    {asset.title}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {asset.channel}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      asset.status === 'PUBLISHED'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-sky-400">
                    {Object.entries(asset.linked_fact_versions || {}).map(([fid, ver]) => (
                      <span key={fid} className="mr-2 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {fid}:v{ver}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                    {new Date(asset.published_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
