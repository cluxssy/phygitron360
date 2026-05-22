import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, CheckCircle, XCircle, AlertCircle, Send,
  Clock, Loader2, RefreshCw, ChevronDown, ChevronUp,
  X, MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../core/auth/AuthContext';

const OFFER_STATUS_STYLE = {
  pending:           'bg-amber-400/10 text-amber-400 border-amber-400/30',
  approved:          'bg-emerald-400/10 text-emerald-400 border-emerald-400/30',
  changes_requested: 'bg-orange-400/10 text-orange-400 border-orange-400/30',
  sent:              'bg-indigo/10 text-indigo border-indigo/30',
  rejected:          'bg-rose-400/10 text-rose-400 border-rose-400/30',
};

const OFFER_STATUS_ICON = {
  pending:           <Clock size={12} />,
  approved:          <CheckCircle size={12} />,
  changes_requested: <AlertCircle size={12} />,
  sent:              <Send size={12} />,
  rejected:          <XCircle size={12} />,
};

function StatusBadge({ status }) {
  const s = (status || 'pending').toLowerCase();
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${OFFER_STATUS_STYLE[s] || 'bg-white/5 text-white/40 border-white/10'}`}>
      {OFFER_STATUS_ICON[s]} {s.replace('_', ' ')}
    </span>
  );
}

function OfferLetterPreview({ content }) {
  let parsed = null;
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    parsed = null;
  }

  if (!parsed && !content) return <p className="text-xs text-white/30 italic">No offer content available.</p>;

  if (typeof parsed === 'object' && parsed !== null) {
    return (
      <div className="space-y-3 text-sm text-white/70 leading-relaxed">
        {parsed.greeting && <p className="font-bold text-white">{parsed.greeting}</p>}
        {parsed.body && <p className="whitespace-pre-wrap">{parsed.body}</p>}
        {parsed.compensation_details && (
          <div className="glass-panel p-4 space-y-2 mt-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Compensation Details</p>
            {Object.entries(parsed.compensation_details).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-white/40 capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="font-bold text-white">{v}</span>
              </div>
            ))}
          </div>
        )}
        {parsed.terms && <p className="text-xs text-white/50 whitespace-pre-wrap">{parsed.terms}</p>}
        {parsed.closing && <p className="font-bold text-white mt-2">{parsed.closing}</p>}
      </div>
    );
  }

  return <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{typeof content === 'string' ? content : JSON.stringify(content, null, 2)}</p>;
}

function ChangesModal({ offerId, onClose, onDone }) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return toast.error('Please enter feedback');
    setLoading(true);
    try {
      const r = await fetch(`/api/source/offers/${offerId}/request-changes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      if (r.ok) {
        toast.success('Change request submitted');
        onDone();
        onClose();
      } else {
        const d = await r.json();
        toast.error(d.detail || 'Failed to submit changes');
      }
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-panel p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            <MessageSquare size={18} className="text-orange-400" /> Request Changes
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Feedback / Requested Changes</label>
            <textarea
              rows={5}
              required
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors resize-none"
              placeholder="Describe what needs to be changed in this offer letter..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-orange-400 text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
              Submit Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OfferCard({ offer, onRefresh, isHR }) {
  const [expanded, setExpanded] = useState(false);
  const [actioning, setActioning] = useState(null);
  const [showChangesModal, setShowChangesModal] = useState(false);

  const status = (offer.status || 'pending').toLowerCase();
  const isPending = status === 'pending' || status === 'changes_requested';

  const doAction = async (action) => {
    setActioning(action);
    try {
      const r = await fetch(`/api/source/offers/${offer.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (r.ok) {
        toast.success(action === 'approve' ? 'Offer approved!' : 'Offer sent to candidate!');
        onRefresh();
      } else {
        const d = await r.json();
        toast.error(d.detail || `Failed to ${action}`);
      }
    } catch { toast.error('Network error'); }
    finally { setActioning(null); }
  };

  return (
    <>
      <div className="glass-panel p-6 border-white/5 hover:border-primary/20 transition-colors">
        <div className="flex items-start justify-between gap-4">
          {/* Left info */}
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display font-black text-lg shrink-0">
              {(offer.candidate_name || '?')[0]}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{offer.candidate_name || '—'}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/80 mt-0.5">{offer.role_title || '—'}</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {offer.department && (
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{offer.department}</span>
                )}
                {offer.salary && (
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">₹ {offer.salary}</span>
                )}
                {offer.start_date && (
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold flex items-center gap-1">
                    <Clock size={10} /> {offer.start_date}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: badge + actions */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <StatusBadge status={offer.status} />

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* View Details toggle */}
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-colors"
              >
                <FileText size={11} />
                {expanded ? 'Hide' : 'View Details'}
                {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>

              {/* Pending actions */}
              {isPending && (
                <>
                  <button
                    disabled={!!actioning}
                    onClick={() => doAction('approve')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                  >
                    {actioning === 'approve' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                    Approve
                  </button>
                  <button
                    disabled={!!actioning}
                    onClick={() => setShowChangesModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-400/10 border border-orange-400/30 text-orange-400 text-[10px] font-black uppercase tracking-widest hover:bg-orange-400/20 transition-colors disabled:opacity-50"
                  >
                    <AlertCircle size={11} /> Request Changes
                  </button>
                </>
              )}

              {/* HR: Send Offer for approved */}
              {isHR && status === 'approved' && (
                <button
                  disabled={!!actioning}
                  onClick={() => doAction('send')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo/10 border border-indigo/30 text-indigo text-[10px] font-black uppercase tracking-widest hover:bg-indigo/20 transition-colors disabled:opacity-50"
                >
                  {actioning === 'send' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  Send Offer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded offer content */}
        {expanded && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
              <FileText size={11} /> Offer Letter Preview
            </p>
            <div className="glass-panel p-6 bg-white/[0.02] border-white/5">
              <OfferLetterPreview content={offer.content} />
            </div>
            {offer.feedback && (
              <div className="mt-4 glass-panel p-4 bg-orange-400/5 border-orange-400/20">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-2 flex items-center gap-2">
                  <MessageSquare size={11} /> Change Feedback
                </p>
                <p className="text-xs text-white/70 leading-relaxed">{offer.feedback}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showChangesModal && (
        <ChangesModal
          offerId={offer.id}
          onClose={() => setShowChangesModal(false)}
          onDone={onRefresh}
        />
      )}
    </>
  );
}

export default function OfferApprovals() {
  const { hasRole } = useAuth();
  const isHR = hasRole('org_admin') || hasRole('super_admin');

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/source/offers', { credentials: 'include' });
      const d = await r.json();
      if (r.ok) {
        setOffers(d.data || []);
      } else {
        toast.error(d.detail || 'Failed to load offers');
      }
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const pending = offers.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s === 'pending' || s === 'changes_requested';
  });
  const all = offers;

  return (
    <div className="flex flex-col gap-6 h-full">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-black text-white tracking-tighter uppercase italic">
            Offer <span className="text-primary">Approvals</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">
            {offers.length} offer{offers.length !== 1 ? 's' : ''} · Phygitron 360 Source
          </p>
        </div>
        <button
          onClick={fetchOffers}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-white/40">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Loading offers...</span>
          </div>
        ) : (
          <>
            {/* Pending section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Clock size={16} className="text-amber-400" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                  Pending Approval
                </h2>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[10px] font-black">
                  {pending.length}
                </span>
              </div>

              {pending.length === 0 ? (
                <div className="glass-panel flex flex-col items-center justify-center gap-3 py-12 text-center border-white/5">
                  <CheckCircle size={36} className="text-emerald-400/30" />
                  <p className="text-sm font-bold text-white">All clear!</p>
                  <p className="text-xs text-white/30">No offers pending approval.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pending.map(offer => (
                    <OfferCard key={offer.id} offer={offer} onRefresh={fetchOffers} isHR={isHR} />
                  ))}
                </div>
              )}
            </div>

            {/* All Offers section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <FileText size={16} className="text-white/40" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-white/40">
                  All Offers
                </h2>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-[10px] font-black">
                  {all.length}
                </span>
              </div>

              {all.length === 0 ? (
                <div className="glass-panel flex flex-col items-center justify-center gap-3 py-12 text-center border-white/5">
                  <FileText size={36} className="text-white/10" />
                  <p className="text-sm font-bold text-white">No offers yet</p>
                  <p className="text-xs text-white/30">Generate offer letters from candidate profiles.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {all.map(offer => (
                    <OfferCard key={offer.id} offer={offer} onRefresh={fetchOffers} isHR={isHR} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
