import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit3, History, Shield, Check, Calendar, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';
import { getFacts, updateFact } from '../api';

export default function LedgerView({ onFactUpdated }) {
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFact, setSelectedFact] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Edit form state
  const [editStatement, setEditStatement] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const data = await getFacts();
      setFacts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const openEditModal = (fact) => {
    setSelectedFact(fact);
    setEditStatement(fact.statement);
    setEditOwner(fact.fact_owner);
    setEditSource(fact.source);
    setEditReason(`Updated to reflect Q2 engineering/pricing policy.`);
    setEditModalOpen(true);
  };

  const openHistoryModal = (fact) => {
    setSelectedFact(fact);
    setHistoryModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedFact) return;
    setSaving(true);
    try {
      await updateFact(selectedFact.id, {
        statement: editStatement,
        fact_owner: editOwner,
        source: editSource,
        change_reason: editReason
      });
      setEditModalOpen(false);
      await fetchLedger();
      alert(`Fact updated to Version ${selectedFact.version + 1}! Reverse check scan triggered automatically.`);
      if (onFactUpdated) onFactUpdated();
    } catch (err) {
      alert('Error updating fact: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="text-sky-400" size={20} />
            Versioned Brand Source of Truth
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Every approved fact, price, SLA, term, and compliance certificate in PostgreSQL. Each record has a designated human domain owner, source document link, expiry date, and cryptographic version history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLedger()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            Refresh Ledger
          </button>
        </div>
      </div>

      {/* Facts Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-slate-400">Loading ledger facts from PostgreSQL...</div>
        ) : facts.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-400">No facts in ledger.</div>
        ) : (
          facts.map((fact) => (
            <div
              key={fact.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between shadow-md"
            >
              <div>
                {/* Card Top: Category, Version, Expiry */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {fact.category}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      v{fact.version}
                    </span>
                    {fact.is_expired ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        EXPIRED
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Canonical Fact Statement */}
                <h4 className="text-sm font-semibold text-slate-100 mb-3 leading-relaxed">
                  "{fact.statement}"
                </h4>

                {/* Metadata Details */}
                <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between">
                    <span>Fact Owner:</span>
                    <span className="text-slate-200 font-medium">{fact.fact_owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source Doc:</span>
                    <a 
                      href={fact.source} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-sky-400 hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-[220px]"
                    >
                      {fact.source} <ExternalLink size={10} />
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span>Expiry Date:</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {fact.expiry_date || 'No Expiry Set'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => openHistoryModal(fact)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  <History size={13} />
                  <span>Version History ({fact.versions?.length || 1})</span>
                </button>

                <button
                  onClick={() => openEditModal(fact)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition"
                >
                  <Edit3 size={13} />
                  <span>Edit Fact (Triggers Reverse Check)</span>
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Edit Fact Modal */}
      {editModalOpen && selectedFact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 size={18} className="text-sky-400" />
              Edit Fact & Trigger Reverse Check (v{selectedFact.version} → v{selectedFact.version + 1})
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Updating this fact creates an immutable new version snapshot in PostgreSQL. The system will automatically run a reverse check across all published landing pages, documents, and AI copies holding the old claim!
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Approved Statement:</label>
              <textarea
                rows={3}
                value={editStatement}
                onChange={(e) => setEditStatement(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Fact Owner:</label>
                <input
                  type="text"
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Source URL / Cite:</label>
                <input
                  type="text"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Change Justification (Logged to Audit):</label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Reason for fact modification..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Sparkles size={13} />
                <span>{saving ? 'Updating & Scanning...' : 'Commit Version & Run Reverse Check'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyModalOpen && selectedFact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History size={18} className="text-indigo-400" />
                Version Audit: [{selectedFact.id}]
              </h3>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {selectedFact.versions && selectedFact.versions.length > 0 ? (
                selectedFact.versions.map((ver, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-sky-400">Version {ver.version_number}</span>
                      <span className="text-[10px] text-slate-500">{new Date(ver.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-200">"{ver.statement}"</div>
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between">
                      <span>Changed by: <b>{ver.updated_by}</b></span>
                      <span className="italic">{ver.change_reason}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">Baseline version 1.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
