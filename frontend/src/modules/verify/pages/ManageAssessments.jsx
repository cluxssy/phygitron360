import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, RefreshCw, Filter, Trash2, Edit3, Users,
  BarChart2, Send, ChevronDown, Clock, FileText, CheckCircle,
  XCircle, AlertTriangle, Lock, Unlock, Shuffle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';

const TYPE_STYLE = {
  MCQ:     'bg-primary/10 text-primary border-primary/20',
  Coding:  'bg-indigo/10 text-indigo border-indigo/20',
  Written: 'bg-secondary/10 text-secondary border-secondary/20',
  Mixed:   'bg-amber-400/10 text-amber-400 border-amber-400/20',
};

const STATUS_STYLE = {
  draft:   'bg-white/10 text-white/50 border-white/10',
  active:  'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  closed:  'bg-rose-400/10 text-rose-400 border-rose-400/20',
};

const STATUSES = ['draft', 'active', 'closed'];

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel w-full max-w-lg p-8 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-colors">
          <XCircle size={18} />
        </button>
        <h2 className="text-xl font-display font-black text-white uppercase tracking-tighter italic mb-6">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function AssignModal({ assessment, onClose }) {
  const [userIds, setUserIds] = useState('');
  const [deadline, setDeadline] = useState('');
  const [generateVariants, setGenerateVariants] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userIds.trim()) return toast.error('Enter at least one user ID');
    const ids = userIds.split(',').map(s => parseInt(s.trim())).filter(Boolean);
    if (!ids.length) return toast.error('Invalid user IDs');
    setSubmitting(true);
    try {
      const r = await fetch(`/api/verify/assignments/${assessment.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_ids: ids, deadline: deadline || null, generate_variants: generateVariants }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success(`Assigned to ${ids.length} candidate(s)`);
        onClose();
      } else {
        toast.error(d.detail || 'Assignment failed');
      }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal onClose={onClose} title={`Assign // ${assessment.title}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">User IDs (comma-separated)</label>
          <input
            type="text"
            placeholder="e.g. 1, 2, 3"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
            value={userIds}
            onChange={e => setUserIds(e.target.value)}
          />
          <p className="text-[10px] text-white/30 mt-0.5">Enter the numeric IDs of candidates to assign</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Deadline (optional)</label>
          <input
            type="datetime-local"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div>
            <p className="text-sm font-bold text-white">Generate Variants</p>
            <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-widest">AI shuffles question order & options per candidate</p>
          </div>
          <button
            type="button"
            onClick={() => setGenerateVariants(v => !v)}
            className={`relative w-12 h-6 rounded-full border transition-colors duration-200 ${generateVariants ? 'bg-primary border-primary' : 'bg-white/10 border-white/20'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${generateVariants ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors duration-150 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Assign Candidates
        </button>
      </form>
    </Modal>
  );
}

export default function ManageAssessments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useAuth();

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [assignTarget, setAssignTarget] = useState(null);
  const [publishing, setPublishing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/verify/builder/assessments', { credentials: 'include' });
      const d = await r.json();
      setAssessments(d.data || d || []);
    } catch { toast.error('Failed to load assessments'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  const handlePublish = async (asm) => {
    setPublishing(asm.id);
    try {
      const r = await fetch(`/api/verify/builder/assessments/${asm.id}/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      if (r.ok) {
        toast.success(`"${asm.title}" is now live`);
        fetchAssessments();
      } else {
        const d = await r.json();
        toast.error(d.detail || 'Publish failed');
      }
    } catch { toast.error('Network error'); }
    finally { setPublishing(null); }
  };

  const handleStatusChange = async (asm, newStatus) => {
    try {
      const r = await fetch(`/api/verify/builder/assessments/${asm.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (r.ok) {
        toast.success('Status updated');
        fetchAssessments();
      } else {
        const d = await r.json();
        toast.error(d.detail || 'Update failed');
      }
    } catch { toast.error('Network error'); }
  };

  const handleDelete = async (asm) => {
    if (!window.confirm(`Delete "${asm.title}"? This cannot be undone.`)) return;
    setDeleting(asm.id);
    try {
      const r = await fetch(`/api/verify/builder/assessments/${asm.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (r.ok) {
        toast.success('Assessment deleted');
        fetchAssessments();
      } else {
        const d = await r.json();
        toast.error(d.detail || 'Delete failed');
      }
    } catch { toast.error('Network error'); }
    finally { setDeleting(null); }
  };

  const filtered = filterStatus === 'all'
    ? assessments
    : assessments.filter(a => a.status?.toLowerCase() === filterStatus);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-black text-white tracking-tighter uppercase italic">
            Manage <span className="text-primary">Assessments</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">
            {assessments.length} total · Phygitron Verify
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAssessments}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => navigate('/verify?tab=builder')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors duration-150 shadow-lg"
          >
            <Plus size={15} /> New Assessment
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 shrink-0">
        <Filter size={14} className="text-white/30" />
        {['all', 'draft', 'active', 'closed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors ${
              filterStatus === s
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-white/30">
          {filtered.length} shown
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-white/40">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Loading assessments...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 py-24 glass-panel">
            <FileText size={48} className="text-white/10" />
            <div className="text-center">
              <p className="text-base font-bold text-white mb-1">No assessments found</p>
              <p className="text-xs text-white/30">
                {filterStatus !== 'all' ? `No ${filterStatus} assessments` : 'Create your first assessment to get started'}
              </p>
            </div>
            {filterStatus === 'all' && (
              <button
                onClick={() => navigate('/verify?tab=builder')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors duration-150"
              >
                <Plus size={15} /> New Assessment
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filtered.map(asm => (
              <div key={asm.id} className="glass-panel p-6 border-white/5 hover:border-primary/20 transition-colors group flex flex-col gap-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{asm.title}</h3>
                    <p className="text-[10px] text-white/30 mt-0.5 line-clamp-1">{asm.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${TYPE_STYLE[asm.type] || 'bg-white/5 text-white/40 border-white/10'}`}>
                      {asm.type || 'MCQ'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${STATUS_STYLE[asm.status?.toLowerCase()] || STATUS_STYLE.draft}`}>
                      {asm.status || 'Draft'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-5 py-3 border-t border-b border-white/5">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-display font-black text-white">{asm.question_count ?? 0}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">Questions</span>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-display font-black text-white">{asm.time_limit_minutes ?? '—'}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">Minutes</span>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-display font-black text-primary">{asm.pass_score ?? 70}%</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">Pass Score</span>
                  </div>
                  {asm.shuffle_questions && (
                    <>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="flex items-center gap-1 text-[10px] text-amber-400 font-black uppercase tracking-widest">
                        <Shuffle size={12} /> Shuffled
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => navigate(`/verify?tab=builder&id=${asm.id}`)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors duration-150"
                  >
                    <Edit3 size={13} /> Edit
                  </button>

                  {asm.status?.toLowerCase() === 'draft' && (
                    <button
                      onClick={() => handlePublish(asm)}
                      disabled={publishing === asm.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400/20 transition-colors duration-150 disabled:opacity-50"
                    >
                      {publishing === asm.id ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />}
                      Publish
                    </button>
                  )}

                  {/* Status changer */}
                  <div className="relative group/status">
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors duration-150">
                      <Lock size={13} /> Status <ChevronDown size={11} />
                    </button>
                    <div className="absolute top-full left-0 mt-1 z-20 glass-panel p-2 rounded-xl border border-white/10 min-w-[140px] opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all duration-150">
                      {STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(asm, s)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-white/10 ${
                            asm.status?.toLowerCase() === s ? 'text-primary' : 'text-white/60'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/verify?tab=analytics&asm_id=${asm.id}`)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-indigo/10 hover:border-indigo/30 hover:text-indigo transition-colors duration-150"
                  >
                    <BarChart2 size={13} /> Results
                  </button>

                  <button
                    onClick={() => setAssignTarget(asm)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-colors duration-150"
                  >
                    <Users size={13} /> Assign
                  </button>

                  <button
                    onClick={() => handleDelete(asm)}
                    disabled={deleting === asm.id}
                    className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400/40 hover:text-rose-400 hover:bg-rose-400/10 transition-colors duration-150 disabled:opacity-50"
                  >
                    {deleting === asm.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignTarget && (
        <AssignModal assessment={assignTarget} onClose={() => setAssignTarget(null)} />
      )}
    </div>
  );
}
