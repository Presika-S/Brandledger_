import React, { useState, useEffect, useCallback } from 'react';
import { Inbox, CheckCircle2, Clock, RefreshCw, UserCheck, Loader2 } from 'lucide-react';
import { getOwnerInbox, answerOwnerTicket } from '../api';

const RESPONSES = [
  { id: 'CONFIRMED_CLAIM', label: 'Claim is correct', tone: 'emerald' },
  { id: 'CONFIRMED_FACT', label: 'Ledger fact is correct — claim is wrong', tone: 'rose' },
  { id: 'UPDATE_FACT', label: 'Ledger fact is outdated — I will update it', tone: 'amber' }
];

const TONES = {
  emerald: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25',
  rose: 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25',
  amber: 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
};

export default function InboxView({ onCountChange, notify }) {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState('Sarah Jenkins');
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getOwnerInbox('ALL');
      setTickets(all);
      if (onCountChange) onCountChange(all.filter(t => t.status === 'OPEN').length);
    } catch (e) {
      notify?.('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [onCountChange, notify]);

  useEffect(() => { load(); }, [load]);

  const respond = async (ticket, response) => {
    setBusy(ticket.ticket_id + response);
    try {
      await answerOwnerTicket(ticket.ticket_id, response, ownerName, notes[ticket.ticket_id]);
      notify?.('success', 'Response sent. The writer will see it on their claim.');
      await load();
    } catch (e) {
      notify?.('error', e.message);
    } finally {
      setBusy(null);
    }
  };

  const shown = tickets.filter(t => filter === 'ALL' || t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Inbox className="text-amber-400" size={20} /> Fact Owner Inbox
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Claims routed from Draft Guard Studio land here. Answering closes the loop and is written to the audit trail.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Answering as</span>
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 outline-none w-40"
          />
          <button onClick={load} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] w-fit">
        {['OPEN', 'RESOLVED', 'ALL'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded font-medium transition ${filter === f ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
            {f}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="p-10 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl bg-slate-900/50 text-sm">
          {loading ? 'Loading…' : filter === 'OPEN' ? 'Inbox zero. No claims are waiting on a fact owner.' : 'Nothing here yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(t => (
            <div key={t.ticket_id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">{t.claim_type || 'CLAIM'}</span>
                  <span className="text-sm font-bold text-white font-mono">"{t.claim_text || 'unknown claim'}"</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1 ${
                  t.status === 'OPEN' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'}`}>
                  {t.status === 'OPEN' ? <Clock size={10} /> : <CheckCircle2 size={10} />} {t.status}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                <span>Raised by <b className="text-slate-200">{t.raised_by}</b> · {new Date(t.raised_at).toLocaleString()}</span>
                <span>Owner: <b className="text-slate-200">{t.owner}</b></span>
                {t.source_id && <span className="font-mono text-sky-400">[{t.source_id}]</span>}
              </div>

              {t.question && <p className="text-xs text-slate-300 italic">"{t.question}"</p>}

              {t.status === 'OPEN' ? (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <textarea
                    rows={2}
                    value={notes[t.ticket_id] || ''}
                    onChange={(e) => setNotes({ ...notes, [t.ticket_id]: e.target.value })}
                    placeholder="Optional note back to the writer…"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-sky-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    {RESPONSES.map(r => (
                      <button key={r.id} disabled={!!busy} onClick={() => respond(t, r.id)}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition disabled:opacity-50 flex items-center gap-1.5 ${TONES[r.tone]}`}>
                        {busy === t.ticket_id + r.id ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-800 text-xs text-slate-300">
                  <b className="text-emerald-300">{t.response?.replaceAll('_', ' ')}</b> by {t.responded_by}
                  {t.response_note && <span className="text-slate-400"> — "{t.response_note}"</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
