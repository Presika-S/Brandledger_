import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import VerifyDraftView from './components/VerifyDraftView';
import LedgerView from './components/LedgerView';
import ReverseCheckView from './components/ReverseCheckView';
import GuardPlayground from './components/GuardPlayground';
import OwnerInboxView from './components/OwnerInboxView';
import { getOwnerInbox } from './api';
import OCRUploadModal from './components/OCRUploadModal';
import AuditTrailModal from './components/AuditTrailModal';
import { Menu, X, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [trustScore, setTrustScore] = useState(85.0);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const notify = useCallback((type, message) => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), type === 'error' ? 6000 : 3500);
  }, []);

  const refreshInboxCount = useCallback(() => {
    getOwnerInbox('OPEN').then(t => setInboxCount(t.length)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshInboxCount();
    const t = setInterval(refreshInboxCount, 15000);
    return () => clearInterval(t);
  }, [refreshInboxCount]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-black text-white text-base">
            BL
          </div>
          <span className="font-bold text-white text-sm">BrandLedger</span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Vertical Navigation Sidebar (Desktop & Mobile Drawer) */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block shrink-0 z-40`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
          trustScore={trustScore}
          inboxCount={inboxCount}
          onOpenOCR={() => {
            setOcrModalOpen(true);
            setMobileMenuOpen(false);
          }}
          onOpenAudit={() => {
            setAuditModalOpen(true);
            setMobileMenuOpen(false);
          }}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        {activeTab === 'home' && (
          <HomePage
            onNavigate={(tab) => setActiveTab(tab)}
            trustScore={trustScore}
          />
        )}

        {activeTab === 'verify' && (
          <VerifyDraftView
            setGlobalTrustScore={setTrustScore}
            notify={notify}
            onInboxChanged={refreshInboxCount}
            onPublishSuccess={() => setActiveTab('reverse')}
          />
        )}

        {activeTab === 'inbox' && (
          <OwnerInboxView notify={notify} onCountChange={setInboxCount} />
        )}

        {activeTab === 'ledger' && (
          <LedgerView
            onFactUpdated={() => {
              console.log("Fact updated in ledger");
            }}
          />
        )}

        {activeTab === 'reverse' && (
          <ReverseCheckView />
        )}

        {activeTab === 'guard_api' && (
          <GuardPlayground />
        )}

      </main>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2 max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-start gap-2 px-4 py-3 rounded-xl border shadow-2xl text-xs backdrop-blur ${
            t.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
              : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'}`}>
            {t.type === 'error' ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      <OCRUploadModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
      />

      <AuditTrailModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
      />

    </div>
  );
}
