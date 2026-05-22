import React, { useState, useEffect } from 'react';
import {
  Award, XCircle, Clock, Calendar, MessageSquare, Send, CheckCircle, ShieldAlert,
  Loader2, ChevronDown, ChevronUp, Bot, FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';

export default function ResultScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const resultId = params.get('result_id');
  const { user } = useAuth();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dispute/Query form
  const [showQuery, setShowQuery] = useState(false);
  const [querySubject, setQuerySubject] = useState('');
  const [queryMessage, setQueryMessage] = useState('');
  const [submittingQuery, setSubmittingQuery] = useState(false);

  // Expanded questions
  const [expandedQ, setExpandedQ] = useState({});

  useEffect(() => {
    if (!resultId) return;
    setLoading(true);
    fetch(`/api/verify/submissions/results/${resultId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setResult(d.data);
        else toast.error('Failed to load result');
      })
      .catch(() => toast.error('Error loading result'))
      .finally(() => setLoading(false));
  }, [resultId]);

  const submitQuery = async (e) => {
    e.preventDefault();
    if (!queryMessage) return toast.error('Message required');
    setSubmittingQuery(true);
    try {
      const r = await fetch('/api/verify/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_result_id: parseInt(resultId),
          subject: querySubject || 'Result Dispute',
          message: queryMessage
        })
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success('Query submitted to HR');
        setShowQuery(false);
        setQueryMessage('');
        setQuerySubject('');
      } else {
        toast.error(d.detail || 'Submission failed');
      }
    } catch {
      toast.error('Failed to submit query');
    } finally {
      setSubmittingQuery(false);
    }
  };

  const toggleQ = (idx) => {
    setExpandedQ(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!result) return <div className="p-10 text-center text-white/50">Result not found. It may still be grading or you lack permission.</div>;

  const passed = result.total_score >= result.assessment.pass_score;
  const malpractice = result.is_malpractice;
  
  const scoreColor = malpractice ? 'text-rose-500' : passed ? 'text-emerald-400' : 'text-amber-400';
  const scoreBg = malpractice ? 'bg-rose-500/10 border-rose-500/20' : passed ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-amber-400/10 border-amber-400/20';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">
          Assessment <span className="text-primary">Result</span>
        </h1>
        <button onClick={() => navigate('/verify')} className="px-4 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
          Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Score Card */}
        <div className={`md:col-span-2 glass-panel p-8 border-2 ${scoreBg} flex flex-col justify-center`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">{result.assessment.title}</p>
              <h2 className="text-2xl font-bold text-white">{result.user_name}</h2>
            </div>
            {malpractice ? (
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-500 text-xs font-black uppercase flex items-center gap-2">
                <ShieldAlert size={14}/> Flagged
              </div>
            ) : passed ? (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-400/20 text-emerald-400 text-xs font-black uppercase flex items-center gap-2">
                <Award size={14}/> Passed
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-400 text-xs font-black uppercase flex items-center gap-2">
                <XCircle size={14}/> Failed
              </div>
            )}
          </div>

          <div className="flex items-end gap-4 mb-2">
            <span className={`text-6xl font-display font-black leading-none ${scoreColor}`}>
              {Math.round(result.total_score)}%
            </span>
            <span className="text-sm font-bold text-white/40 mb-2 uppercase tracking-widest">
              / Required: {result.assessment.pass_score}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <Clock size={16} className="text-primary/60"/>
              {Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s
            </div>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <Calendar size={16} className="text-primary/60"/>
              {new Date(result.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* AI Summary Card */}
        <div className="glass-panel p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest text-primary">
            <Bot size={14} /> AI Evaluation Summary
          </div>
          {result.ai_summary ? (
            <p className="text-sm text-white/70 leading-relaxed overflow-y-auto">{result.ai_summary}</p>
          ) : (
            <p className="text-sm text-white/30 italic">No summary generated.</p>
          )}
          
          {user?.id === result.user_id && (
            <div className="mt-auto pt-4 border-t border-white/5">
              <button onClick={() => setShowQuery(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
                <MessageSquare size={14} /> Raise Query
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Query Form */}
      {showQuery && (
        <div className="glass-panel p-6 border-primary/30">
          <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4">Raise a Query / Appeal</h3>
          <form onSubmit={submitQuery} className="space-y-4">
            <input
              type="text"
              placeholder="Subject (Optional)"
              value={querySubject}
              onChange={e => setQuerySubject(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary/40"
            />
            <textarea
              required
              placeholder="Explain your concern regarding the evaluation..."
              value={queryMessage}
              onChange={e => setQueryMessage(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/40 min-h-[100px]"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowQuery(false)} className="px-4 py-2 rounded-xl text-white/40 hover:text-white text-xs font-black uppercase">Cancel</button>
              <button type="submit" disabled={submittingQuery} className="px-6 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase hover:bg-white transition-colors flex items-center gap-2">
                {submittingQuery ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Breakdown */}
      <h3 className="text-lg font-display font-black text-white mt-8 mb-4">Question Breakdown</h3>
      <div className="space-y-3">
        {(result.details || []).map((detail, i) => {
          const q = result.assessment.questions.find(x => x.id === detail.question_id) || {};
          const isExpanded = expandedQ[i];
          const fullMarks = detail.score_awarded >= q.marks;
          const partial = detail.score_awarded > 0 && detail.score_awarded < q.marks;
          
          return (
            <div key={i} className="glass-panel overflow-hidden border border-white/5">
              <button onClick={() => toggleQ(i)} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${fullMarks ? 'bg-emerald-400/20 text-emerald-400' : partial ? 'bg-amber-400/20 text-amber-400' : 'bg-rose-500/20 text-rose-500'}`}>
                    Q{i+1}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium line-clamp-1 max-w-xl">{q.question_text || 'Question text unavailable'}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{q.question_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`text-sm font-black ${fullMarks ? 'text-emerald-400' : partial ? 'text-amber-400' : 'text-rose-500'}`}>
                    {detail.score_awarded} / {q.marks} pts
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                </div>
              </button>
              
              {isExpanded && (
                <div className="p-6 bg-black/20 border-t border-white/5 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Candidate Answer</h4>
                    <div className="bg-white/5 p-4 rounded-xl text-sm text-white/80 whitespace-pre-wrap font-mono">
                      {detail.answer_provided || '(No answer provided)'}
                    </div>
                  </div>
                  
                  {detail.feedback && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2"><FileText size={12}/> AI Feedback</h4>
                      <p className="text-sm text-white/70 leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10">
                        {detail.feedback}
                      </p>
                    </div>
                  )}
                  
                  {detail.test_results && detail.test_results.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Test Cases</h4>
                      <div className="space-y-2">
                        {detail.test_results.map((tr, trIdx) => (
                          <div key={trIdx} className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${tr.passed ? 'bg-emerald-400/5 border-emerald-400/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                            <span>Test Case {trIdx + 1}</span>
                            <span>{tr.passed ? 'PASSED' : 'FAILED'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
