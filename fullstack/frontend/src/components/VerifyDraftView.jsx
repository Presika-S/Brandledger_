import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ShieldAlert, ShieldCheck, HelpCircle, Check, X, AlertTriangle, 
  Send, Sparkles, ArrowRight, UserCheck, CheckCircle2, RefreshCw,
  Loader2, Download, Wand2, Clock, MessageSquareWarning, Gavel
} from 'lucide-react';
import { verifyDraft, recordReviewAction, publishDraft, getDecisions } from '../api';

const claimKey = (c) => `${c.claim_type}|${c.claim_text}`;

const REVIEWERS = {
  writer: 'Alex (Writer)',
  brand_manager: 'Morgan (Brand Manager)',
  fact_owner: 'Sarah Jenkins (Fact Owner)'
};

const MODAL_COPY = {
  DISPUTE: {
    title: 'Dispute this claim',
    icon: MessageSquareWarning,
    tone: 'text-slate-200',
    help: 'Explain why the flag is wrong. Brand Governance will review it; the claim stays blocked until it is resolved.',
    label: 'Dispute reason',
    placeholder: 'e.g. The $79 price is the approved promo for the EU launch (see campaign brief)…',
    chips: ['Fact in ledger looks outdated', 'Claim is from an approved campaign', 'Flag is a false positive'],
    min: 5,
    cta: 'Submit Dispute',
    ctaClass: 'bg-slate-600 hover:bg-slate-500'
  },
  ASK_OWNER: {
    title: 'Route to Fact Owner',
    icon: UserCheck,
    tone: 'text-amber-300',
    help: 'Creates a ticket in the Fact Owner Inbox. The owner confirms the claim or the ledger fact and the answer comes back here.',
    label: 'Question for the owner (optional)',
    placeholder: 'e.g. Can you confirm whether this price applies to annual billing?',
    chips: ['Please confirm this is still accurate', 'Is there an exception for this campaign?'],
    min: 0,
    cta: 'Send to Owner',
    ctaClass: 'bg-amber-600 hover:bg-amber-500'
  },
  OVERRIDE: {
    title: 'Brand Manager governance override',
    icon: Gavel,
    tone: 'text-rose-400',
    help: 'Bypasses the verification pipeline for this one claim. Permanently recorded in the audit trail with your reason.',
    label: 'Governance justification (required, min 10 characters)',
    placeholder: 'e.g. Special partner concession approved by CMO, ticket GOV-214…',
    chips: ['Approved by CMO', 'Legal has signed off', 'Time-boxed partner exception'],
    min: 10,
    cta: 'Log Override & Approve',
    ctaClass: 'bg-rose-600 hover:bg-rose-500'
  }
};

// Work out what a claim's real state is once human decisions are layered on top.
function effectiveState(claim, decision) {
  if (claim.status === 'VERIFIED') return { key: 'VERIFIED', blocking: false };
  if (decision?.decision === 'OVERRIDE') return { key: 'OVERRIDDEN', blocking: false };
  if (decision?.decision === 'ASK_OWNER') {
    if (decision.owner_response === 'CONFIRMED_CLAIM') return { key: 'OWNER_APPROVED', blocking: false };
    if (decision.owner_response === 'CONFIRMED_FACT') return { key: 'OWNER_REJECTED', blocking: true };
    if (decision.owner_response === 'UPDATE_FACT') return { key: 'OWNER_UPDATING', blocking: true };
    return { key: 'AWAITING_OWNER', blocking: true };
  }
  if (decision?.decision === 'DISPUTE') return { key: 'DISPUTED', blocking: true };
  return { key: claim.status, blocking: true };
}

const STATE_BADGE = {
  VERIFIED: ['Verified', 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'],
  FLAGGED: ['Flagged', 'bg-rose-500/20 text-rose-300 border-rose-500/40'],
  ABSTAIN: ['Abstain (needs owner)', 'bg-amber-500/20 text-amber-300 border-amber-500/40'],
  OVERRIDDEN: ['Overridden', 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'],
  OWNER_APPROVED: ['Approved by owner', 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'],
  OWNER_REJECTED: ['Owner: ledger is right', 'bg-rose-500/20 text-rose-300 border-rose-500/40'],
  OWNER_UPDATING: ['Owner updating ledger', 'bg-amber-500/20 text-amber-300 border-amber-500/40'],
  AWAITING_OWNER: ['Awaiting owner', 'bg-amber-500/20 text-amber-300 border-amber-500/40'],
  DISPUTED: ['Disputed – in review', 'bg-slate-500/20 text-slate-200 border-slate-400/40']
};

const SAMPLE_DRAFTS = [
  {
    id: 'demo_seeded_errors',
    title: 'Q1 Product Launch Announcement (Seeded Errors)',
    channel: 'Marketing / Blog',
    content: `Brand Ledger is excited to announce our new Enterprise Cloud tier! Starting at only $79 per month, we guarantee a 99.9% uptime SLA with 24/7 dedicated support. We are proud to be SOC 2 Type II certified (2023) and offer best-in-class AI governance with zero-downtime promises.`
  },
  {
    id: 'demo_ai_draft',
    title: 'AI Tool Generated Customer Email',
    channel: 'Email / Customer Comms',
    content: `Dear Customer, BrandLedger offers unlimited storage and guaranteed instant response from our engineering team. Our Enterprise Cloud starts at $99 per month with 99.99% uptime.`
  },
  {
    id: 'demo_compliant',
    title: 'Verified Compliant Press Release',
    channel: 'Public Relations',
    content: `BrandLedger Enterprise Cloud starts at $99 per month billed annually. BrandLedger guarantees a 99.99% uptime SLA for Enterprise Cloud customers with 24/7 dedicated support, backed by SOC 2 Type II certification in 2025.`
  }
];

export default function VerifyDraftView({ setGlobalTrustScore, onPublishSuccess, notify = () => {}, onInboxChanged }) {
  const [selectedSample, setSelectedSample] = useState(SAMPLE_DRAFTS[0].id);
  const [draftTitle, setDraftTitle] = useState(SAMPLE_DRAFTS[0].title);
  const [draftContent, setDraftContent] = useState(SAMPLE_DRAFTS[0].content);
  const [channel, setChannel] = useState(SAMPLE_DRAFTS[0].channel);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [verifiedContent, setVerifiedContent] = useState(''); // exact text the spans refer to
  const [decisions, setDecisions] = useState({});
  const [userRole, setUserRole] = useState('brand_manager'); // writer, brand_manager, fact_owner
  const [activeClaimFilter, setActiveClaimFilter] = useState('ALL');
  const [publishing, setPublishing] = useState(false);
  const [fixingAll, setFixingAll] = useState(false);

  // One modal handles Dispute / Route to Owner / Override
  const [modal, setModal] = useState({ open: false, type: null, claim: null });
  const [modalText, setModalText] = useState('');
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState('');

  const reviewer = REVIEWERS[userRole];
  const draftId = selectedSample; // stable per draft so decisions survive re-verification

  const refreshDecisions = useCallback(async () => {
    try {
      setDecisions(await getDecisions(draftId));
    } catch (e) {
      console.error(e);
    }
  }, [draftId]);

  const runVerification = useCallback(async (content, title) => {
    setLoading(true);
    try {
      const [data, dec] = await Promise.all([
        verifyDraft(content, title, draftId),
        getDecisions(draftId).catch(() => ({}))
      ]);
      setResult(data);
      setVerifiedContent(content);
      setDecisions(dec);
      return data;
    } catch (err) {
      console.error(err);
      notify('error', 'Verification failed. Is the FastAPI backend running on localhost:8000?');
      return null;
    } finally {
      setLoading(false);
    }
  }, [draftId, notify]);

  const handleRunVerification = () => runVerification(draftContent, draftTitle);

  // Auto-verify on mount
  useEffect(() => {
    handleRunVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectSample = (sampleId) => {
    const s = SAMPLE_DRAFTS.find(d => d.id === sampleId);
    if (s) {
      setSelectedSample(sampleId);
      setDraftTitle(s.title);
      setDraftContent(s.content);
      setChannel(s.channel);
      setResult(null);
      setDecisions({});
    }
  };

  // Everything derived from claims + human decisions
  const view = useMemo(() => {
    if (!result) return null;
    const claims = result.claims.map(c => {
      const decision = decisions[claimKey(c)] || null;
      return { ...c, decision, eff: effectiveState(c, decision) };
    });
    const blocking = claims.filter(c => c.eff.blocking);
    const needsWork = claims.filter(c => c.status !== 'VERIFIED');
    const weights = { VERIFIED: 1, OWNER_APPROVED: 1, OVERRIDDEN: 0.75, AWAITING_OWNER: 0.5, ABSTAIN: 0.5, OWNER_UPDATING: 0.5, DISPUTED: 0.25, FLAGGED: 0, OWNER_REJECTED: 0 };
    const score = claims.length
      ? Math.round(claims.reduce((a, c) => a + (weights[c.eff.key] ?? 0), 0) / claims.length * 1000) / 10
      : 100;
    return {
      claims,
      blockingCount: blocking.length,
      resolved: needsWork.length - blocking.length,
      needsWork: needsWork.length,
      canPublish: blocking.length === 0,
      score
    };
  }, [result, decisions]);

  useEffect(() => {
    if (view && setGlobalTrustScore) setGlobalTrustScore(view.score);
  }, [view?.score]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for fact-owner replies while any claim is waiting on one
  const hasWaiting = view?.claims.some(c => c.eff.key === 'AWAITING_OWNER');
  useEffect(() => {
    if (!hasWaiting) return;
    const t = setInterval(refreshDecisions, 8000);
    return () => clearInterval(t);
  }, [hasWaiting, refreshDecisions]);

  // Replace the exact claim span (falls back to text match if the draft was edited since verify)
  const applyFixToText = (text, claim) => {
    if (text.slice(claim.start_pos, claim.end_pos) === claim.claim_text) {
      return text.slice(0, claim.start_pos) + claim.suggested_fix + text.slice(claim.end_pos);
    }
    return text.replace(claim.claim_text, claim.suggested_fix);
  };

  const logAction = (claim, decision, comment, overrideReason) =>
    recordReviewAction({
      claim, decision, draftId,
      reviewerName: reviewer, reviewerRole: userRole,
      comment, overrideReason
    });

  const handleAcceptFix = async (claim) => {
    if (!claim.suggested_fix) return;
    try {
      const updated = applyFixToText(draftContent, claim);
      setDraftContent(updated);
      await logAction(claim, 'ACCEPT_FIX', `Accepted suggested fix: ${claim.suggested_fix}`);
      notify('success', `Applied fix: ${claim.suggested_fix}`);
      await runVerification(updated, draftTitle);
    } catch (e) {
      notify('error', e.message);
    }
  };

  // Unique feature: fix every flagged claim that has an approved fix, in one pass
  const fixable = view?.claims.filter(c => c.suggested_fix && c.status !== 'VERIFIED') || [];
  const handleApplyAll = async () => {
    if (!fixable.length) return;
    setFixingAll(true);
    try {
      let text = draftContent;
      // go right-to-left so earlier character offsets stay valid
      [...fixable].sort((a, b) => b.start_pos - a.start_pos).forEach(c => { text = applyFixToText(text, c); });
      setDraftContent(text);
      await Promise.all(fixable.map(c => logAction(c, 'ACCEPT_FIX', `Bulk fix: ${c.suggested_fix}`)));
      notify('success', `Applied ${fixable.length} approved fix${fixable.length > 1 ? 'es' : ''}.`);
      await runVerification(text, draftTitle);
    } catch (e) {
      notify('error', e.message);
    } finally {
      setFixingAll(false);
    }
  };

  const openModal = (type, claim) => {
    setModal({ open: true, type, claim });
    setModalText('');
    setModalError('');
  };
  const closeModal = () => {
    if (modalBusy) return;
    setModal({ open: false, type: null, claim: null });
  };

  const submitModal = async () => {
    const cfg = MODAL_COPY[modal.type];
    const text = modalText.trim();
    if (text.length < cfg.min) {
      setModalError(cfg.min <= 5 ? 'Please write a short reason.' : `Please write at least ${cfg.min} characters.`);
      return;
    }
    setModalBusy(true);
    setModalError('');
    try {
      const { claim, type } = modal;
      if (type === 'OVERRIDE') {
        await logAction(claim, 'OVERRIDE', 'Manual override approved', text);
      } else if (type === 'DISPUTE') {
        await logAction(claim, 'DISPUTE', text);
      } else {
        const owner = claim.source_owner || 'Brand Governance';
        await logAction(claim, 'ASK_OWNER', text || `Please confirm this claim. Owner: ${owner}`);
        if (onInboxChanged) onInboxChanged();
      }
      await refreshDecisions();
      setModal({ open: false, type: null, claim: null });
      notify('success', {
        OVERRIDE: 'Override logged to the audit trail. Claim approved.',
        DISPUTE: 'Dispute recorded and sent to Brand Governance.',
        ASK_OWNER: `Ticket sent to ${claim.source_owner || 'Brand Governance'}. Track it in the Fact Owner Inbox.`
      }[type]);
    } catch (e) {
      setModalError(e.message || 'Something went wrong. Nothing was saved.');
    } finally {
      setModalBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!result || !view?.canPublish) return;
    setPublishing(true);
    try {
      const verifiedIds = result.claims.map(c => c.source_id).filter(Boolean);
      const pubRes = await publishDraft(
        result.draft_id,
        draftTitle,
        draftContent,
        channel,
        'Brand Governance Desk',
        verifiedIds
      );
      notify('success', `Published "${pubRes.title}". Claims bound to active fact versions.`);
      if (onPublishSuccess) onPublishSuccess();
    } catch (e) {
      notify('error', 'Publishing failed: ' + e.message);
    } finally {
      setPublishing(false);
    }
  };

  // Unique feature: downloadable compliance report
  const handleExportReport = () => {
    if (!view) return;
    const lines = [
      `# BrandLedger Compliance Report`,
      ``,
      `**Draft:** ${draftTitle}  `,
      `**Channel:** ${channel}  `,
      `**Generated:** ${new Date().toLocaleString()}  `,
      `**Reviewer:** ${reviewer}  `,
      `**Trust score:** ${view.score}%  `,
      `**Publish-ready:** ${view.canPublish ? 'Yes' : 'No (' + view.blockingCount + ' blocking)'}`,
      ``,
      `## Claims`,
      ``,
      `| Claim | Type | Engine verdict | Final state | Source | Decision / reason |`,
      `|---|---|---|---|---|---|`,
      ...view.claims.map(c => `| ${c.claim_text} | ${c.claim_type} | ${c.status} | ${STATE_BADGE[c.eff.key]?.[0] || c.eff.key} | ${c.source_id || '-'} | ${c.decision ? `${c.decision.decision}: ${(c.decision.reason || '').replace(/\|/g, '/')} (${c.decision.by})` : '-'} |`),
      ``,
      `## Draft text`,
      ``,
      draftContent
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandledger-report-${draftId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Unique feature: inline span highlighting on the real text
  const highlighted = useMemo(() => {
    if (!view || !verifiedContent) return null;
    const spans = [...view.claims]
      .filter(c => verifiedContent.slice(c.start_pos, c.end_pos) === c.claim_text)
      .sort((a, b) => a.start_pos - b.start_pos);
    const out = [];
    let cursor = 0;
    spans.forEach((c, i) => {
      if (c.start_pos < cursor) return; // skip overlaps
      if (c.start_pos > cursor) out.push(<span key={`t${i}`}>{verifiedContent.slice(cursor, c.start_pos)}</span>);
      const cls = ['VERIFIED', 'OWNER_APPROVED'].includes(c.eff.key) ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
        : c.eff.key === 'OVERRIDDEN' ? 'bg-fuchsia-500/20 border-fuchsia-500/60 text-fuchsia-200'
        : c.status === 'FLAGGED' ? 'bg-rose-500/20 border-rose-500/60 text-rose-200'
        : 'bg-amber-500/20 border-amber-500/60 text-amber-200';
      out.push(
        <mark key={`c${i}`} title={`${c.status}: ${c.explanation}`}
          className={`px-0.5 rounded border-b-2 ${cls}`}>{c.claim_text}</mark>
      );
      cursor = c.end_pos;
    });
    if (cursor < verifiedContent.length) out.push(<span key="tail">{verifiedContent.slice(cursor)}</span>);
    return out;
  }, [view, verifiedContent]);

  const filteredClaims = view?.claims.filter(c => {
    if (activeClaimFilter === 'ALL') return true;
    if (activeClaimFilter === 'NEEDS ACTION') return c.eff.blocking;
    return c.status === activeClaimFilter;
  }) || [];

  return (
    <div className="space-y-6">
      
      {/* Sample Selector & Role Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Load Test Scenario:
          </span>
          <div className="flex gap-2">
            {SAMPLE_DRAFTS.map(sample => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                  selectedSample === sample.id
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>

        {/* User Role Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Reviewing as:</span>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 outline-none"
          >
            <option value="writer">Content Writer</option>
            <option value="brand_manager">Brand Manager (Full Override Rights)</option>
            <option value="fact_owner">Fact Owner (Domain Authority)</option>
          </select>
        </div>
      </div>

      {/* Main Split Layout: Editor on Left, Verification Stream on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Draft Content & Claim Highlighter */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col h-full shadow-lg">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="font-bold text-slate-100 bg-transparent text-sm outline-none border-b border-transparent focus:border-sky-500 w-72"
                  placeholder="Draft Title"
                />
                <div className="text-xs text-slate-400 mt-0.5">Channel: {channel}</div>
              </div>

              <button
                onClick={handleRunVerification}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
              >
                <Sparkles size={14} className={loading ? 'animate-spin' : ''} />
                <span>{loading ? 'Analyzing Claims...' : 'Verify Claims with /guard'}</span>
              </button>
            </div>

            {/* Editable Draft Textarea */}
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Draft Text (AI generated or human drafted)
            </label>
            <textarea
              rows={8}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:border-sky-500 outline-none leading-relaxed font-sans resize-none"
              placeholder="Paste draft or AI copy to analyze claims..."
            />

            {/* Inline claim highlighter on the real text */}
            {view && highlighted && view.claims.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Claim Map ({view.claims.length} claims, exact character spans)
                  </span>
                  {draftContent !== verifiedContent && (
                    <span className="text-[11px] text-amber-400">Draft edited. Re-verify to refresh.</span>
                  )}
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm leading-7 text-slate-300 whitespace-pre-wrap">
                  {highlighted}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500">
                  <span><i className="inline-block w-2 h-2 rounded-sm bg-emerald-500/60 mr-1" />verified</span>
                  <span><i className="inline-block w-2 h-2 rounded-sm bg-rose-500/60 mr-1" />flagged</span>
                  <span><i className="inline-block w-2 h-2 rounded-sm bg-amber-500/60 mr-1" />needs owner</span>
                  <span><i className="inline-block w-2 h-2 rounded-sm bg-fuchsia-500/60 mr-1" />overridden</span>
                </div>
              </div>
            )}

            {/* Publishing Bar */}
            {view && (
              <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                {view.needsWork > 0 && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Review progress</span>
                      <span>{view.resolved} of {view.needsWork} flagged claims resolved</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all"
                        style={{ width: `${(view.resolved / view.needsWork) * 100}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      {view.canPublish ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={13} /> Ready for Publish
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle size={13} /> {view.blockingCount} claim{view.blockingCount > 1 ? 's' : ''} still blocking
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {view.canPublish
                        ? 'Every claim is verified, approved by its owner, or overridden with a logged reason.'
                        : 'Apply fixes, wait for fact owners, or record an override to publish.'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fixable.length > 0 && (
                      <button
                        onClick={handleApplyAll}
                        disabled={fixingAll || loading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 font-semibold text-xs transition disabled:opacity-50"
                      >
                        {fixingAll ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                        Apply all fixes ({fixable.length})
                      </button>
                    )}
                    <button
                      onClick={handleExportReport}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                      title="Download a Markdown compliance report"
                    >
                      <Download size={13} /> Report
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={!view.canPublish || publishing}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
                    >
                      {publishing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      <span>Publish to Registry</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Verification Engine Results Stream */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Header Summary & Filter Pills */}
          {view && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-black text-white font-mono">
                  {view.score}%
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Governance Trust Score</div>
                  <div className="text-[11px] text-slate-400">{result.audit_summary}</div>
                </div>
              </div>

              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                {['ALL', 'NEEDS ACTION', 'FLAGGED', 'ABSTAIN', 'VERIFIED'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveClaimFilter(filter)}
                    className={`px-2 py-0.5 rounded font-medium transition ${
                      activeClaimFilter === filter
                        ? 'bg-sky-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Claim Cards Stream */}
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {!view ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                {loading ? 'Analyzing claims…' : 'Click'}  "Verify Claims with /guard" to run the rules engine, pgvector retrieval, and cite-or-abstain verification.
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                No claims match filter '{activeClaimFilter}'.
              </div>
            ) : (
              filteredClaims.map((claim) => (
                <div
                  key={claim.claim_id}
                  className={`p-4 rounded-xl border transition ${
                    ['VERIFIED', 'OWNER_APPROVED'].includes(claim.eff.key)
                      ? 'bg-emerald-950/20 border-emerald-500/30 glow-verified'
                      : claim.eff.key === 'OVERRIDDEN'
                      ? 'bg-fuchsia-950/20 border-fuchsia-500/30'
                      : claim.status === 'FLAGGED'
                      ? 'bg-rose-950/20 border-rose-500/30 glow-flagged'
                      : 'bg-amber-950/20 border-amber-500/30 glow-abstain'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {claim.claim_type}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">
                        "{claim.claim_text}"
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${STATE_BADGE[claim.eff.key]?.[1]}`}>
                        {STATE_BADGE[claim.eff.key]?.[0] || claim.eff.key}
                      </span>
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                    {claim.explanation}
                  </p>

                  {/* Suggested Fix Banner (Flagged) */}
                  {claim.suggested_fix && claim.eff.blocking && (
                    <div className="mb-3 p-2.5 rounded-lg bg-sky-950/40 border border-sky-500/30 flex items-center justify-between">
                      <div className="text-xs text-sky-200">
                        <span className="font-semibold text-sky-400">Approved Fix: </span>
                        <b>{claim.suggested_fix}</b>
                      </div>
                      <button
                        onClick={() => handleAcceptFix(claim)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] transition"
                        title="Accept fix and update draft text automatically"
                      >
                        <Check size={12} />
                        <span>Apply Fix</span>
                      </button>
                    </div>
                  )}

                  {/* Verified Source Citation Box */}
                  {claim.source_quote && (
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1 mb-3">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-mono text-sky-400">Source Fact: [{claim.source_id}]</span>
                        <span>Owner: <b className="text-slate-300">{claim.source_owner}</b></span>
                      </div>
                      <div className="text-slate-300 italic">
                        "{claim.source_quote}"
                      </div>
                    </div>
                  )}

                  {/* Latest human decision on this claim */}
                  {claim.decision && claim.decision.decision !== 'ACCEPT_FIX' && (
                    <div className="mb-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                      <Clock size={12} className="mt-0.5 text-slate-500 shrink-0" />
                      <div>
                        <b className="text-slate-200">{claim.decision.decision.replace('_', ' ')}</b> by {claim.decision.by}
                        {claim.decision.owner_response && (
                          <> · owner replied <b className="text-slate-200">{claim.decision.owner_response.replaceAll('_', ' ')}</b></>
                        )}
                        {claim.decision.reason && <div className="italic text-slate-400 mt-0.5">"{claim.decision.reason}"</div>}
                      </div>
                    </div>
                  )}

                  {/* Human Decision Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-end gap-2 text-xs">
                    {claim.status !== 'VERIFIED' && claim.eff.key !== 'OVERRIDDEN' && claim.eff.key !== 'OWNER_APPROVED' && (
                      <>
                        <button
                          onClick={() => openModal('DISPUTE', claim)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                        >
                          Dispute Claim
                        </button>

                        <button
                          onClick={() => openModal('ASK_OWNER', claim)}
                          disabled={claim.eff.key === 'AWAITING_OWNER'}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {claim.eff.key === 'AWAITING_OWNER' ? 'Sent to Owner' : 'Route to Fact Owner'}
                        </button>

                        {userRole === 'brand_manager' && (
                          <button
                            onClick={() => openModal('OVERRIDE', claim)}
                            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-medium transition"
                          >
                            Override (Log Reason)
                          </button>
                        )}
                      </>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* Unified action modal: Dispute / Route to Owner / Override */}
      {modal.open && (() => {
        const cfg = MODAL_COPY[modal.type];
        const Icon = cfg.icon;
        return (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onKeyDown={(e) => { if (e.key === 'Escape') closeModal(); }}
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
              <h3 className={`text-base font-bold flex items-center gap-2 mb-1 ${cfg.tone}`}>
                <Icon size={18} /> {cfg.title}
              </h3>
              <div className="text-xs font-mono text-white mb-2">"{modal.claim.claim_text}"</div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{cfg.help}</p>

              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{cfg.label}</label>
              <textarea
                autoFocus
                rows={3}
                value={modalText}
                onChange={(e) => { setModalText(e.target.value); setModalError(''); }}
                placeholder={cfg.placeholder}
                className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-sky-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                {cfg.chips.map(chip => (
                  <button key={chip} type="button" onClick={() => setModalText(chip)}
                    className="text-[10px] px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
                    {chip}
                  </button>
                ))}
              </div>

              {modalError && (
                <div className="mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-[11px] text-rose-300">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={closeModal} disabled={modalBusy}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={submitModal} disabled={modalBusy}
                  className={`px-4 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 ${cfg.ctaClass}`}>
                  {modalBusy && <Loader2 size={12} className="animate-spin" />}
                  {cfg.cta}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
