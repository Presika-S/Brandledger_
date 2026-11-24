import React, { useState, useEffect } from 'react';
import { History, X, Shield, Clock, FileText } from 'lucide-react';
import { getAuditLogs } from '../api';

export default function AuditTrailModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getAuditLogs()
        .then(setLogs)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="text-indigo-400" size={20} />
            <h3 className="text-base font-bold text-white">
              Immutable Brand Governance Audit Trail
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Comprehensive log of all fact modifications, overrides, disputes, and draft publication events stored permanently in PostgreSQL for SOC 2 compliance.
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No audit records found.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-sky-400 flex items-center gap-1.5">
                    <Shield size={12} className="text-indigo-400" />
                    {log.action_type}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Actor: <b className="text-slate-200">{log.actor}</b> ({log.role})</span>
                  <span className="font-mono text-slate-500">ID: {log.id}</span>
                </div>

                {log.details && (
                  <pre className="mt-1 p-2 rounded bg-slate-900 text-[10px] text-slate-300 font-mono overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
