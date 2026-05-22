import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Clock, CheckCircle, AlertTriangle, Play,
  BarChart2, RefreshCw, Calendar, FileText, TrendingUp, Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';

const STATUS_STYLE = {
  pending:   'bg-amber-400/10 text-amber-400 border-amber-400/20',
  started:   'bg-primary/10 text-primary border-primary/20',
  submitted: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  graded:    'bg-indigo/10 text-indigo border-indigo/20',
  expired:   'bg-rose-400/10 text-rose-400 border-rose-400/20',
};

function DeadlineCountdown({ deadline }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!deadline) { setDisplay('No deadline'); return; }
    const calc = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) { setDisplay('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 48) setDisplay(`${Math.floor(h / 24)}d ${h % 24}h left`);
      else setDisplay(`${h}h ${m}m left`);
    };
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [deadline]);

  const isUrgent = deadline && (new Date(deadline) - new Date()) < 24 * 3600000;

  return (
    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${isUrgent ? 'text-rose-400' : 'text-white/40'}`}>
      <Clock size={11} /> {display}
    </span>
  );
}

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [results, setResults] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);

  const fetchAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const r = await fetch('/api/verify/assignments/my-tests', { credentials: 'include' });
      const d = await r.json();
      setAssignments(d.data || d || []);
    } catch { toast.error('Failed to load assignments'); }
    finally { setLoadingAssignments(false); }
  }, []);

  const fetchResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const r = await fetch('/api/verify/submissions/my-results', { credentials: 'include' });
      const d = await r.json();
      setResults(d.data || d || []);
    } catch { /* silent */ }
    finally { setLoadingResults(false); }
  }, []);

  useEffect(() => { fetchAssignments(); fetchResults(); }, [fetchAssignments, fetchResults]);

  const pendingCount = assignments.filter(a => ['pending', 'started'].includes(a.status?.toLowerCase())).length;

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
      {/* Hero */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-indigo/20 rounded-[40px] blur-xl opacity-40" />
        <div className="glass-panel p-10 border-white/5 relative overflow-hidden bg-[#060E20]/50">
          <div className="absolute top-[-80px] right-[-80px] w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-3">Candidate Portal // Phygitron Verify</p>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">
            Welcome, <span className="text-primary">{user?.name?.split(' ')[0] || 'Candidate'}</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
            {pendingCount > 0 ? `${pendingCount} assessment${pendingCount > 1 ? 's' : ''} awaiting your attention` : 'All caught up • No pending assessments'}
          </p>

          <div className="flex gap-4 mt-8">
            <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Assigned</p>
              <p className="text-xl font-display font-black text-white">{assignments.length}</p>
            </div>
            <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Pending</p>
              <p className="text-xl font-display font-black text-amber-400">{pendingCount}</p>
            </div>
            <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Completed</p>
              <p className="text-xl font-display font-black text-emerald-400">{results.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Assignments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <FileText size={14} className="text-primary" /> My Assignments
          </h2>
          <button onClick={fetchAssignments} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {loadingAssignments ? (
          <div className="flex items-center justify-center gap-3 py-12 text-white/40">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Loading assignments...</span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="glass-panel p-10 flex flex-col items-center gap-4 text-center">
            <Calendar size={40} className="text-white/10" />
            <div>
              <p className="text-sm font-bold text-white mb-1">No assignments yet</p>
              <p className="text-xs text-white/30">You'll see your assessments here when assigned</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => {
              const s = a.status?.toLowerCase();
              const isActionable = s === 'pending' || s === 'started';
              const isCompleted = s === 'submitted' || s === 'graded';
              return (
                <div key={a.id} className={`glass-panel p-5 border-white/5 flex items-center gap-4 ${isActionable ? 'hover:border-primary/30' : ''} transition-colors`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isActionable ? 'bg-primary/10 text-primary' :
                    isCompleted ? 'bg-emerald-400/10 text-emerald-400' :
                    'bg-white/5 text-white/30'
                  }`}>
                    {isCompleted ? <CheckCircle size={22} /> : <FileText size={22} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-white truncate">{a.assessment_title || a.title || 'Assessment'}</h3>
                      <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest shrink-0 ${STATUS_STYLE[s] || 'bg-white/5 text-white/40 border-white/10'}`}>
                        {a.status || 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <DeadlineCountdown deadline={a.deadline} />
                      {a.time_limit_minutes && (
                        <span className="text-[10px] text-white/30 font-black uppercase tracking-widest flex items-center gap-1">
                          <Clock size={11} /> {a.time_limit_minutes}m
                        </span>
                      )}
                    </div>
                  </div>

                  {isActionable && (
                    <button
                      onClick={() => navigate(`/verify?tab=take&asm_id=${a.assessment_id || a.id}`)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors duration-150 shrink-0"
                    >
                      <Play size={13} fill="currentColor" /> Start
                    </button>
                  )}
                  {isCompleted && a.result_id && (
                    <button
                      onClick={() => navigate(`/verify?tab=result&result_id=${a.result_id}`)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400/10 hover:border-emerald-400/20 hover:text-emerald-400 transition-colors duration-150 shrink-0"
                    >
                      <BarChart2 size={13} /> Results
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Results */}
      <div>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-secondary" /> Score History
        </h2>

        {loadingResults ? (
          <div className="flex items-center justify-center gap-3 py-8 text-white/40">
            <Loader2 size={18} className="animate-spin text-primary" />
          </div>
        ) : results.length === 0 ? (
          <div className="glass-panel p-8 flex flex-col items-center gap-3 text-center opacity-60">
            <Award size={32} className="text-white/10" />
            <p className="text-xs text-white/30">No completed assessments yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(r => {
              const pct = Math.round(r.percentage_score ?? r.score ?? 0);
              const passed = r.passed;
              return (
                <div key={r.id} className="glass-panel p-5 border-white/5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white text-sm truncate">{r.assessment_title || 'Assessment'}</h4>
                    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest shrink-0 ${
                      passed ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-rose-400/10 text-rose-400 border-rose-400/20'
                    }`}>
                      {passed ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${passed ? 'bg-emerald-400' : 'bg-rose-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-sm font-display font-black ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30">
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ''}
                    </span>
                    {r.id && (
                      <button
                        onClick={() => navigate(`/verify?tab=result&result_id=${r.id}`)}
                        className="text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
                      >
                        View →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
