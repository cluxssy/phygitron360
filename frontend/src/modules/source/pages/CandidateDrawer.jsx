import React, { useState, useEffect } from 'react';
import {
  X, MapPin, Mail, Phone, Briefcase, Clock,
  Zap, Shield, MessageSquare, CheckCircle,
  AlertTriangle, ExternalLink, UserCheck, Send,
  Star, Loader2, ChevronRight,
  Globe, Calendar, DollarSign, Activity, FileText,
  Award, Globe2, BookOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const LEVEL_COLOR = {
  beginner:     'bg-white/5 border-white/10 text-white/50',
  intermediate: 'bg-indigo/10 border-indigo/20 text-indigo',
  advanced:     'bg-primary/10 border-primary/20 text-primary',
  expert:       'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
};

export default function CandidateDrawer({ candidate, jobRoles, onClose, onRefresh, onConvert }) {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Invite state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);

  // Score state
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scoreRoleId, setScoreRoleId] = useState('');
  const [scoring, setScoring] = useState(false);

  // AI analysis parsed from stored scores
  const fitScore = profile?.ai_scores?.find(s => s.score_type === 'role_fit');
  let fitData = null;
  try { fitData = fitScore ? JSON.parse(fitScore.reasoning) : null; } catch { /* ignore */ }

  const confidence = profile?.ai_scores?.find(s => s.score_type === 'confidence_signals');
  let confFlags = [];
  try { confFlags = confidence ? JSON.parse(confidence.reasoning || '[]').filter(f => f.flag) : []; } catch { /* ignore */ }

  // Fetch full profile when drawer opens
  useEffect(() => {
    if (!candidate) { setProfile(null); return; }
    setProfile(null);
    setLoadingProfile(true);
    setShowInviteForm(false);
    setShowScoreForm(false);
    fetch(`/api/source/candidates/${candidate.id}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setProfile(d.data); })
      .catch(() => { /* use shallow data */ })
      .finally(() => setLoadingProfile(false));
  }, [candidate?.id]);

  const data = profile || candidate;

  // ── Send invite ──────────────────────────────────────────────────────────
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteRoleId) return toast.error('Select a role');
    setInviting(true);
    try {
      const r = await fetch('/api/source/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidate.id, role_id: parseInt(inviteRoleId) }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success('Invite sent!');
        setShowInviteForm(false);
        onRefresh();
      } else { toast.error(d.detail || 'Failed'); }
    } catch { toast.error('Error sending invite'); }
    finally { setInviting(false); }
  };

  // ── AI Score ─────────────────────────────────────────────────────────────
  const handleScore = async (e) => {
    e.preventDefault();
    if (!scoreRoleId) return toast.error('Select a role');
    setScoring(true);
    try {
      const r = await fetch('/api/source/score-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: parseInt(scoreRoleId), candidate_ids: [candidate.id] }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success('Scored!');
        setShowScoreForm(false);
        onRefresh();
        // Refetch profile to show new score
        const rr = await fetch(`/api/source/candidates/${candidate.id}`);
        const dd = await rr.json();
        if (dd.status === 'success') setProfile(dd.data);
      } else { toast.error(d.detail || 'Scoring failed'); }
    } catch { toast.error('Scoring error'); }
    finally { setScoring(false); }
  };

  if (!candidate) return null;

  return (
    <>
      {/* Backdrop - only covers the content area, not the sidebars */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ left: 88 + 280 }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full z-[110] bg-[#040812] border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ${candidate ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 520 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-8 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-display font-black text-primary shrink-0">
              {(data?.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h2 className="text-2xl font-display font-black text-white tracking-tighter">{data?.full_name || '—'}</h2>
              <p className="text-xs text-primary/80 font-bold uppercase tracking-widest mt-1">{data?.current_designation || 'CANDIDATE'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          {loadingProfile && (
            <div className="flex items-center justify-center gap-2 py-12 text-white/30">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">Loading profile...</span>
            </div>
          )}

          <div className="p-8 space-y-8">

            {data?.ai_summary && (
              <div className="glass-panel p-5 bg-primary/5 border-primary/20">
                <SectionLabel icon={<Star size={13} />} label="AI Profile Summary" color="text-primary" />
                <p className="text-xs text-white/70 leading-relaxed font-medium">{data.ai_summary}</p>
              </div>
            )}

            {/* Basic info */}
            <section className="grid grid-cols-2 gap-4">
              {[
                { icon: Mail, val: data?.email, link: `mailto:${data?.email}` },
                { icon: Phone, val: data?.phone },
                { icon: MapPin, val: data?.location },
                { icon: Briefcase, val: data?.current_company },
                { icon: Clock, val: data?.total_experience_years ? `${data.total_experience_years} years` : null },
                { icon: DollarSign, val: data?.expected_salary ? `Exp: ${data.expected_salary}` : null },
                { icon: Calendar, val: data?.notice_period ? `Notice: ${data.notice_period}` : null },
                { icon: Activity, val: data?.availability ? `Status: ${data.availability}` : null },
                { icon: FileText, val: data?.portfolio_url ? 'Portfolio' : null, link: data?.portfolio_url },
                { icon: Globe, val: data?.linkedin_url ? 'LinkedIn' : null, link: data?.linkedin_url },
              ].filter(i => i.val).map(({ icon: Icon, val, link }, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-white/60">
                  <Icon size={14} className="text-primary/60 shrink-0" />
                  {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary transition-colors hover:underline">
                      {val}
                    </a>
                  ) : (
                    <span className="truncate">{val}</span>
                  )}
                </div>
              ))}
            </section>

            {/* AI Fit Score */}
            {(data?.fit_score != null || fitScore) && (
              <section>
                <SectionLabel icon={<Star size={13} />} label="AI Role Fit Score" />
                <div className="glass-panel p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-4xl font-display font-black ${
                      (data.fit_score || fitScore?.score) >= 80 ? 'text-emerald-400' :
                      (data.fit_score || fitScore?.score) >= 60 ? 'text-primary' : 'text-rose-400'
                    }`}>
                      {Math.round(data.fit_score || fitScore?.score || 0)}%
                    </span>
                    {fitData?.summary && (
                      <p className="text-xs text-white/50 max-w-[260px] text-right leading-relaxed">{fitData.summary}</p>
                    )}
                  </div>

                  {fitData && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">Matched</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(fitData.matched_skills || []).map(s => (
                            <span key={s} className="px-2.5 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-bold">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-2">Missing</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(fitData.missing_skills || []).map(s => (
                            <span key={s} className="px-2.5 py-1 rounded-lg bg-rose-400/10 border border-rose-400/20 text-rose-400 text-[10px] font-bold">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Skills */}
            {(data?.skills || []).length > 0 && (
              <section>
                <SectionLabel icon={<Zap size={13} />} label="Skill Profile" />
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[11px] font-bold text-white">{s.skill_name || s.name}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase ${LEVEL_COLOR[s.level] || 'bg-white/5 border-white/10 text-white/30'}`}>
                        {s.level}
                      </span>
                      {s.years_of_use && (
                         <span className="text-[9px] text-white/30">{s.years_of_use}y</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Experience History */}
            {data?.experience?.length > 0 && (
              <section>
                <SectionLabel icon={<Briefcase size={13} />} label="Professional Experience" />
                <div className="space-y-3">
                  {data.experience.map((exp, i) => (
                    <div key={i} className="glass-panel p-4">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-white">{exp.designation}</p>
                        <span className="text-[10px] text-white/40 shrink-0 ml-2">{exp.start_date || 'Unknown'} - {exp.end_date || (exp.is_current ? 'Present' : 'Present')}</span>
                      </div>
                      <p className="text-[11px] text-primary/80 mb-2 font-bold uppercase tracking-widest">{exp.company}</p>
                      {exp.description && <p className="text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education History */}
            {data?.education?.length > 0 && (
              <section>
                <SectionLabel icon={<Shield size={13} />} label="Education" />
                <div className="space-y-3">
                  {data.education.map((edu, i) => (
                    <div key={i} className="glass-panel p-4">
                      <p className="text-xs font-bold text-white mb-1">{edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}</p>
                      <p className="text-[11px] text-primary/80 font-bold uppercase tracking-widest">{edu.institution}</p>
                      {(edu.start_date || edu.end_date || edu.year) && <p className="text-[10px] text-white/40 mt-1">{edu.start_date || edu.year} - {edu.end_date || ''}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications & Languages */}
            <div className="grid grid-cols-2 gap-6">
              {data?.certifications?.length > 0 && (
                <section>
                  <SectionLabel icon={<Award size={13} />} label="Certifications" />
                  <div className="space-y-2">
                    {data.certifications.map((cert, i) => (
                      <div key={i} className="glass-panel p-3">
                        <p className="text-xs font-bold text-white">{cert.name}</p>
                        {cert.issuer && <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest mt-1">{cert.issuer}</p>}
                        {cert.year > 0 && <p className="text-[10px] text-white/40 mt-1">{cert.year}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {data?.languages?.length > 0 && (
                <section>
                  <SectionLabel icon={<Globe2 size={13} />} label="Languages" />
                  <div className="space-y-2">
                    {data.languages.map((lang, i) => (
                      <div key={i} className="flex justify-between items-center glass-panel p-3">
                        <p className="text-xs font-bold text-white">{lang.name}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{lang.proficiency}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Achievements */}
            {data?.achievements?.length > 0 && (
              <section>
                <SectionLabel icon={<BookOpen size={13} />} label="Achievements" />
                <div className="space-y-2">
                  {data.achievements.map((ach, i) => (
                    <div key={i} className="glass-panel px-4 py-3 border-l-2 border-emerald-400/50">
                      <p className="text-[11px] text-white/70 leading-relaxed font-medium">{ach}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Confidence Flags */}
            {confFlags.length > 0 && (
              <section>
                <SectionLabel icon={<AlertTriangle size={13} className="text-amber-400" />} label="Confidence Flags" color="text-amber-400" />
                <div className="space-y-2">
                  {confFlags.map((f, i) => (
                    <div key={i} className="glass-panel p-4 border-amber-400/10 bg-amber-400/5 flex items-start gap-3">
                      <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">{f.skill}</p>
                        <p className="text-[11px] text-white/40 leading-relaxed">{f.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Confidence clear */}
            {profile && confFlags.length === 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-400/5 border border-emerald-400/10">
                <CheckCircle size={15} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">No confidence flags detected</span>
              </div>
            )}

            {/* Interview Questions */}
            {fitData?.interview_questions?.length > 0 && (
              <section>
                <SectionLabel icon={<MessageSquare size={13} />} label="Suggested Interview Questions" />
                <div className="space-y-2">
                  {fitData.interview_questions.map((q, i) => (
                    <div key={i} className="glass-panel px-5 py-4 border-l-2 border-primary/30">
                      <p className="text-sm text-white/80 leading-relaxed">"{q}"</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Score against role - inline form */}
            {showScoreForm && (
              <section>
                <SectionLabel icon={<Star size={13} />} label="Score Against Role" />
                <form onSubmit={handleScore} className="glass-panel p-5 flex gap-3">
                  <select
                    required
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
                    value={scoreRoleId}
                    onChange={e => setScoreRoleId(e.target.value)}
                  >
                    <option value="">Select role...</option>
                    {jobRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                  <button type="submit" disabled={scoring} className="px-5 py-2.5 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50">
                    {scoring ? <Loader2 size={14} className="animate-spin" /> : 'Score'}
                  </button>
                  <button type="button" onClick={() => setShowScoreForm(false)} className="px-4 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                    <X size={16} />
                  </button>
                </form>
              </section>
            )}

            {/* Send invite - inline form */}
            {showInviteForm && (
              <section>
                <SectionLabel icon={<Send size={13} />} label="Invite to Assessment" />
                <form onSubmit={handleInvite} className="glass-panel p-5 flex gap-3">
                  <select
                    required
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
                    value={inviteRoleId}
                    onChange={e => setInviteRoleId(e.target.value)}
                  >
                    <option value="">Select role...</option>
                    {jobRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                  <button type="submit" disabled={inviting} className="px-5 py-2.5 rounded-xl bg-indigo text-white text-xs font-black uppercase tracking-widest hover:bg-indigo/80 transition-colors disabled:opacity-50">
                    {inviting ? <Loader2 size={14} className="animate-spin" /> : 'Invite'}
                  </button>
                  <button type="button" onClick={() => setShowInviteForm(false)} className="px-4 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                    <X size={16} />
                  </button>
                </form>
              </section>
            )}

            {/* Resume link */}
            {data?.resume_path && (
              <a
                href={`/api/source/candidates/${data.id}/resume`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-white/40 hover:text-primary transition-colors font-bold uppercase tracking-widest"
              >
                <ExternalLink size={13} /> View Resume
              </a>
            )}
          </div>
        </div>

        {/* Footer action bar */}
        <div className="p-6 border-t border-white/5 shrink-0 flex gap-3">
          <button
            onClick={() => { setShowScoreForm(s => !s); setShowInviteForm(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors duration-150 ${showScoreForm ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Star size={14} /> Score
          </button>
          <button
            onClick={() => { setShowInviteForm(s => !s); setShowScoreForm(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors duration-150 ${showInviteForm ? 'bg-indigo/10 border-indigo/30 text-indigo' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Send size={14} /> Invite
          </button>
          {data?.status?.toLowerCase() !== 'hired' && (
            <button
              onClick={() => onConvert(candidate.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-black uppercase tracking-widest hover:bg-emerald-400/20 transition-colors duration-150"
            >
              <UserCheck size={14} /> Hire
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function SectionLabel({ icon, label, color = 'text-white/30' }) {
  return (
    <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest mb-3 ${color}`}>
      {icon} {label}
    </div>
  );
}
