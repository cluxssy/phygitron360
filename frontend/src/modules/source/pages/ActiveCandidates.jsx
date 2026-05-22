import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Loader2, RefreshCw, ChevronDown,
  Clock, Activity, CheckCircle, Mail, MapPin, ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_STYLE = {
  active:      'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  shortlisted: 'bg-primary/10 text-primary border-primary/20',
  invited:     'bg-indigo/10 text-indigo border-indigo/20',
  hired:       'bg-secondary/10 text-secondary border-secondary/20',
  rejected:    'bg-rose-400/10 text-rose-400 border-rose-400/20',
};

const ASSESSMENT_STYLE = {
  pending:     'bg-white/5 text-white/40 border-white/10',
  in_progress: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  completed:   'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  failed:      'bg-rose-400/10 text-rose-400 border-rose-400/20',
};

function StatusBadge({ status, styleMap }) {
  const s = (status || '').toLowerCase();
  const cls = styleMap[s] || 'bg-white/5 text-white/40 border-white/10';
  return (
    <span className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${cls}`}>
      {s.replace('_', ' ') || 'Unknown'}
    </span>
  );
}

function formatRelative(d) {
  if (!d) return '—';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return d; }
}

function CandidateRow({ c, expanded, onToggle }) {
  return (
    <>
      <div
        onClick={onToggle}
        className={`grid grid-cols-[1fr_1fr_120px_120px_120px_100px_40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors duration-150 group ${expanded ? 'bg-primary/5' : 'hover:bg-white/[0.02]'}`}
      >
        {/* Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-display font-black text-xs text-white group-hover:border-primary/30 transition-colors shrink-0">
            {(c.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{c.full_name || '—'}</p>
          </div>
        </div>

        {/* Email */}
        <p className="text-xs text-white/40 truncate">{c.email || '—'}</p>

        {/* Role */}
        <p className="text-xs font-bold text-white/70 truncate">{c.role_title || c.current_designation || '—'}</p>

        {/* Status */}
        <div className="flex justify-center">
          <StatusBadge status={c.status || 'active'} styleMap={STATUS_STYLE} />
        </div>

        {/* Assessment status */}
        <div className="flex justify-center">
          <StatusBadge status={c.assessment_status || 'pending'} styleMap={ASSESSMENT_STYLE} />
        </div>

        {/* Last active */}
        <span className="text-xs text-white/40 flex items-center gap-1.5">
          <Clock size={11} className="shrink-0" />
          {formatRelative(c.last_active || c.updated_at)}
        </span>

        {/* Expand toggle */}
        <div className="flex justify-center text-white/20 group-hover:text-white/50 transition-colors">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded detail row */}
      {expanded && (
        <div className="bg-primary/[0.03] border-t border-primary/10 px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {c.email && (
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Mail size={12} className="text-primary/60 shrink-0" />
                <a href={`mailto:${c.email}`} className="hover:text-primary transition-colors truncate">{c.email}</a>
              </div>
            )}
            {c.location && (
              <div className="flex items-center gap-2 text-xs text-white/50">
                <MapPin size={12} className="text-primary/60 shrink-0" />
                <span className="truncate">{c.location}</span>
              </div>
            )}
            {c.total_experience_years != null && (
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Activity size={12} className="text-primary/60 shrink-0" />
                <span>{c.total_experience_years} yrs experience</span>
              </div>
            )}
            {c.fit_score != null && (
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle size={12} className="text-primary/60 shrink-0" />
                <span className={`font-black ${c.fit_score >= 80 ? 'text-emerald-400' : c.fit_score >= 60 ? 'text-primary' : 'text-rose-400'}`}>
                  AI Fit: {Math.round(c.fit_score)}%
                </span>
              </div>
            )}
            {c.ai_summary && (
              <div className="col-span-full mt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1.5">AI Summary</p>
                <p className="text-xs text-white/50 leading-relaxed">{c.ai_summary}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'invited', label: 'Invited' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ActiveCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/source/candidates/active?${params}`, { credentials: 'include' });
      const d = await r.json();
      if (r.ok) {
        setCandidates(d.data || []);
      } else {
        toast.error(d.detail || 'Failed to load candidates');
      }
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const toggleExpand = (id) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div className="flex flex-col gap-6 h-full">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-black text-white tracking-tighter uppercase italic">
            Active <span className="text-primary">Candidates</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">
            {candidates.length} record{candidates.length !== 1 ? 's' : ''} · Phygitron 360 Source
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status filter */}
          <select
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            onClick={fetchCandidates}
            disabled={loading}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_120px_120px_120px_100px_40px] gap-4 px-6 py-4 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 shrink-0">
          <div>Candidate</div>
          <div>Email</div>
          <div>Role</div>
          <div className="text-center">Status</div>
          <div className="text-center">Assessment</div>
          <div>Last Active</div>
          <div />
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar" style={{ overscrollBehavior: 'contain' }}>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-white/40">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest">Loading active candidates...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <Users size={48} className="text-white/10" />
              <div>
                <p className="text-base font-bold text-white mb-1">No active candidates</p>
                <p className="text-xs text-white/30">Candidates who have logged in will appear here.</p>
              </div>
            </div>
          ) : (
            candidates.map(c => (
              <CandidateRow
                key={c.id}
                c={c}
                expanded={expandedId === c.id}
                onToggle={() => toggleExpand(c.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
