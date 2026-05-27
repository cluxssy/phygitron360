import React, { useState, useEffect } from 'react';
import {
  X, MapPin, Mail, Phone, Briefcase, Clock,
  Zap, Shield, MessageSquare, CheckCircle,
  AlertTriangle, ExternalLink, UserCheck, Send,
  Star, Loader2, ChevronRight,
  Globe, Calendar, DollarSign, Activity, FileText,
  Award, Globe2, BookOpen, Plus, Trash2, Edit
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const LEVEL_COLOR = {
  beginner:     'bg-white/5 border-white/10 text-white/50',
  intermediate: 'bg-indigo/10 border-indigo/20 text-indigo',
  advanced:     'bg-primary/10 border-primary/20 text-primary',
  expert:       'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
};

const STATUS_STYLE = {
  active:      'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  shortlisted: 'bg-primary/10 text-primary border-primary/20',
  invited:     'bg-indigo/10 text-indigo border-indigo/20',
  hired:       'bg-secondary/10 text-secondary border-secondary/20',
  rejected:    'bg-rose-400/10 text-rose-400 border-rose-400/20',
  archived:    'bg-rose-400/5 text-rose-400/60 border-rose-400/10',
};

export default function CandidateDrawer({ candidate, jobRoles, onClose, onRefresh, onConvert }) {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Edit Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('intermediate');
  const [newSkillYears, setNewSkillYears] = useState(1);
  const [savingProfile, setSavingProfile] = useState(false);

  // Status transition states
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Invite state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);

  // Score state
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scoreRoleId, setScoreRoleId] = useState('');
  const [scoring, setScoring] = useState(false);

  // Offer state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerDetails, setOfferDetails] = useState({ role_title: '', salary: '', department: '', location: '', start_date: '' });
  const [offerPreview, setOfferPreview] = useState(null);
  const [generatingOffer, setGeneratingOffer] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState(false);

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
    setIsEditing(false);
    fetch(`/api/source/candidates/${candidate.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setProfile(d.data); })
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
        body: JSON.stringify({ candidate_ids: [candidate.id], job_role_id: parseInt(inviteRoleId) }),
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
        if (dd.success) setProfile(dd.data);
      } else { toast.error(d.detail || 'Scoring failed'); }
    } catch { toast.error('Scoring error'); }
    finally { setScoring(false); }
  };

  // ── Status Transition ────────────────────────────────────────────────────
  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true);
    const tid = toast.loading(`Updating status to ${newStatus}...`);
    try {
      const r = await fetch(`/api/source/candidates/${candidate.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success(`Status updated to ${newStatus}`, { id: tid });
        onRefresh();
        setProfile(prev => prev ? { ...prev, status: newStatus } : { ...candidate, status: newStatus });
      } else {
        toast.error(d.detail || 'Failed to update status', { id: tid });
      }
    } catch {
      toast.error('Error updating status', { id: tid });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Edit Profile Helpers ─────────────────────────────────────────────────
  const startEditing = () => {
    const activeSkills = Array.isArray(data.structured_skills)
      ? data.structured_skills.map(s => ({ name: s.skill_name || s.name, level: s.level, years_of_use: s.years_of_use }))
      : (Array.isArray(data.skills) ? data.skills.map(s => typeof s === 'string' ? { name: s, level: 'intermediate', years_of_use: null } : s) : []);

    setEditForm({
      full_name: data.full_name || '',
      phone: data.phone || '',
      location: data.location || '',
      current_designation: data.current_designation || '',
      current_company: data.current_company || '',
      expected_salary: data.expected_salary || '',
      notice_period: data.notice_period || '',
      availability: data.availability || '',
      linkedin_url: data.linkedin_url || '',
      portfolio_url: data.portfolio_url || '',
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
      languages: Array.isArray(data.languages) ? data.languages : [],
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      experience: Array.isArray(data.experience) ? data.experience : [],
      education: Array.isArray(data.education) ? data.education : [],
      skills: activeSkills
    });
    setIsEditing(true);
  };

  const addSkillToForm = () => {
    if (!newSkillName.trim()) return;
    if (editForm.skills.some(s => s.name?.toLowerCase() === newSkillName.trim().toLowerCase())) {
      toast.error('Skill already exists');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      skills: [...prev.skills, { name: newSkillName.trim(), level: newSkillLevel, years_of_use: parseInt(newSkillYears) || null }]
    }));
    setNewSkillName('');
  };

  const removeSkillFromForm = (idx) => {
    setEditForm(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== idx)
    }));
  };

  const updateSkillInForm = (idx, field, value) => {
    setEditForm(prev => {
      const updated = [...prev.skills];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, skills: updated };
    });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    const tid = toast.loading('Saving profile changes...');
    try {
      const r = await fetch(`/api/source/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success('Candidate profile updated!', { id: tid });
        setIsEditing(false);
        onRefresh();
        // Refetch complete profile to sync state
        const rr = await fetch(`/api/source/candidates/${candidate.id}`);
        const dd = await rr.json();
        if (dd.success) setProfile(dd.data);
      } else {
        toast.error(d.detail || 'Failed to save changes', { id: tid });
      }
    } catch {
      toast.error('Error saving changes', { id: tid });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Offer Generation ──────────────────────────────────────────────────────
  const handleGenerateOffer = async (e) => {
    e.preventDefault();
    setGeneratingOffer(true);
    try {
      const r = await fetch(`/api/source/candidates/${candidate.id}/offer-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerDetails),
      });
      const d = await r.json();
      if (r.ok) {
        setOfferPreview(d.data);
      } else {
        toast.error(d.detail || 'Generation failed');
      }
    } catch { toast.error('Error generating offer'); }
    finally { setGeneratingOffer(false); }
  };

  const handleCreateOffer = async () => {
    setCreatingOffer(true);
    try {
      const r = await fetch(`/api/source/candidates/${candidate.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...offerDetails, offer_content: { content: offerPreview } }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success('Offer letter generated and pending approval!');
        setShowOfferForm(false);
        onRefresh();
      } else {
        toast.error(d.detail || 'Failed');
      }
    } catch { toast.error('Error creating offer'); }
    finally { setCreatingOffer(false); }
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
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
              >
                <Edit size={12} /> Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="px-4 py-2 bg-primary rounded-xl text-[10px] font-black uppercase tracking-widest text-black hover:bg-white transition-colors"
                >
                  Save
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-colors">
              <X size={20} />
            </button>
          </div>
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
            {isEditing ? (
              <form onSubmit={saveProfile} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Shield size={14} /> Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editForm.full_name}
                        onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Phone</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Location</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Availability</label>
                      <input
                        type="text"
                        value={editForm.availability}
                        onChange={e => setEditForm({ ...editForm, availability: e.target.value })}
                        placeholder="e.g. Immediate, 30 days"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Current Company</label>
                      <input
                        type="text"
                        value={editForm.current_company}
                        onChange={e => setEditForm({ ...editForm, current_company: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Current Designation</label>
                      <input
                        type="text"
                        value={editForm.current_designation}
                        onChange={e => setEditForm({ ...editForm, current_designation: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Expected Salary</label>
                      <input
                        type="text"
                        value={editForm.expected_salary}
                        onChange={e => setEditForm({ ...editForm, expected_salary: e.target.value })}
                        placeholder="e.g. ₹15 LPA, $120k"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Notice Period</label>
                      <input
                        type="text"
                        value={editForm.notice_period}
                        onChange={e => setEditForm({ ...editForm, notice_period: e.target.value })}
                        placeholder="e.g. 1 Month"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">LinkedIn URL</label>
                      <input
                        type="text"
                        value={editForm.linkedin_url}
                        onChange={e => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Portfolio URL</label>
                      <input
                        type="text"
                        value={editForm.portfolio_url}
                        onChange={e => setEditForm({ ...editForm, portfolio_url: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Skills Management Section */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Zap size={14} /> Manage Skills
                  </h3>
                  
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {editForm.skills.length === 0 ? (
                      <p className="text-[10px] text-white/30 uppercase font-bold text-center py-4">No skills added yet</p>
                    ) : (
                      editForm.skills.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-xs font-bold text-white flex-1 truncate">{s.name}</span>
                          
                          <select
                            value={s.level || 'intermediate'}
                            onChange={e => updateSkillInForm(idx, 'level', e.target.value)}
                            className="bg-[#0c1328] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-primary/30"
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="expert">Expert</option>
                          </select>

                          <input
                            type="number"
                            min={0}
                            max={50}
                            placeholder="Yrs"
                            value={s.years_of_use || ''}
                            onChange={e => updateSkillInForm(idx, 'years_of_use', parseInt(e.target.value) || null)}
                            className="w-12 bg-[#0c1328] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white text-center outline-none focus:border-primary/30"
                          />

                          <button
                            type="button"
                            onClick={() => removeSkillFromForm(idx)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-400/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <input
                      type="text"
                      placeholder="New skill name..."
                      value={newSkillName}
                      onChange={e => setNewSkillName(e.target.value)}
                      className="flex-1 bg-[#0c1328] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                    
                    <select
                      value={newSkillLevel}
                      onChange={e => setNewSkillLevel(e.target.value)}
                      className="bg-[#0c1328] border border-white/10 rounded-lg px-2 text-[10px] text-white outline-none"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>

                    <input
                      type="number"
                      min={0}
                      max={50}
                      placeholder="Years"
                      value={newSkillYears}
                      onChange={e => setNewSkillYears(e.target.value)}
                      className="w-14 bg-[#0c1328] border border-white/10 rounded-lg px-2 text-[10px] text-white text-center outline-none"
                    />

                    <button
                      type="button"
                      onClick={addSkillToForm}
                      className="px-3 py-1.5 bg-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 py-3 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile Details'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Status Transition Row */}
                <div className="glass-panel p-4 flex items-center justify-between gap-4 border-white/5 bg-white/[0.02] rounded-2xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Current Status</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase w-fit ${STATUS_STYLE[data?.status?.toLowerCase()] || 'bg-white/5 border-white/10 text-white/40'}`}>
                      {data?.status || 'New'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {data?.status?.toLowerCase() !== 'shortlisted' && (
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleStatusUpdate('Shortlisted')}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary hover:text-black text-primary text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Shortlist
                      </button>
                    )}
                    {data?.status?.toLowerCase() !== 'archived' && (
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleStatusUpdate('Archived')}
                        className="px-3 py-1.5 rounded-lg bg-rose-400/10 border border-rose-400/20 hover:bg-rose-400 hover:text-white text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Archive
                      </button>
                    )}
                    {(data?.status?.toLowerCase() === 'shortlisted' || data?.status?.toLowerCase() === 'archived' || data?.status?.toLowerCase() === 'rejected') && (
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleStatusUpdate('New')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white hover:text-black text-white/60 text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Move to Active
                      </button>
                    )}
                  </div>
                </div>

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

                {/* Verify Assessments & Forge Courses Integration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Verify Assessments */}
                  <div className="glass-panel p-4 bg-[#0a1226]/50 border-white/5 flex flex-col h-[240px]">
                    <SectionLabel icon={<Shield size={13} className="text-secondary" />} label="Verify Assessments" color="text-secondary" />
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                      {(!data?.assessment_results || data.assessment_results.length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-white/30 gap-2">
                          <Shield size={20} className="opacity-20" />
                          <p className="text-[9px] uppercase font-bold tracking-widest">No assessments</p>
                        </div>
                      ) : (
                        data.assessment_results.map((asm) => {
                          const isPass = asm.score >= asm.pass_score;
                          const dateStr = asm.submitted_at ? new Date(asm.submitted_at).toLocaleDateString() : 'N/A';
                          return (
                            <div key={asm.id} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                              <div className="flex justify-between items-start">
                                <p className="text-[11px] font-bold text-white truncate max-w-[100px]" title={asm.assessment_title}>{asm.assessment_title}</p>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  asm.is_malpractice ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                  isPass ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {asm.is_malpractice ? 'Malpractice' : isPass ? 'Pass' : 'Fail'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[9px] text-white/40">
                                <span>Score: <strong className="text-white">{asm.score}%</strong> ({asm.pass_score}%)</span>
                                <span>{dateStr}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Forge Courses */}
                  <div className="glass-panel p-4 bg-[#0a1226]/50 border-white/5 flex flex-col h-[240px]">
                    <SectionLabel icon={<BookOpen size={13} className="text-indigo" />} label="Forge Courses" color="text-indigo" />
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                      {(!data?.course_enrollments || data.course_enrollments.length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-white/30 gap-2">
                          <BookOpen size={20} className="opacity-20" />
                          <p className="text-[9px] uppercase font-bold tracking-widest">No courses</p>
                        </div>
                      ) : (
                        data.course_enrollments.map((crs) => {
                          const progress = crs.progress_percent || 0;
                          const isCompleted = crs.status?.toLowerCase() === 'completed' || progress === 100;
                          return (
                            <div key={crs.id} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                              <div className="flex justify-between items-start">
                                <p className="text-[11px] font-bold text-white truncate max-w-[100px]" title={crs.course_title}>{crs.course_title}</p>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                  'bg-indigo-500/20 text-indigo border border-indigo-500/30'
                                }`}>
                                  {crs.status || (progress === 100 ? 'Completed' : 'Enrolled')}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] text-white/40">
                                  <span>Progress</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

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
                {((data?.structured_skills || data?.skills || []).length > 0) && (
                  <section>
                    <SectionLabel icon={<Zap size={13} />} label="Skill Profile" />
                    <div className="flex flex-wrap gap-2">
                      {(data.structured_skills || data.skills).map((s, i) => {
                        const name = typeof s === 'string' ? s : (s.skill_name || s.name);
                        const lvl = typeof s === 'string' ? 'intermediate' : (s.level || 'intermediate');
                        const yrs = typeof s === 'string' ? null : s.years_of_use;
                        return (
                          <div key={i} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[11px] font-bold text-white">{name}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase ${LEVEL_COLOR[lvl] || 'bg-white/5 border-white/10 text-white/30'}`}>
                              {lvl}
                            </span>
                            {yrs && (
                               <span className="text-[9px] text-white/30">{yrs}y</span>
                            )}
                          </div>
                        );
                      })}
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

                {/* Suggested Interview Questions */}
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
              </>
            )}
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
              onClick={() => { setShowOfferForm(true); setOfferPreview(null); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-black uppercase tracking-widest hover:bg-emerald-400/20 transition-colors duration-150"
            >
              <UserCheck size={14} /> Hire
            </button>
          )}
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowOfferForm(false)}>
          <div className="glass-panel w-full max-w-2xl p-8 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowOfferForm(false)} className="absolute top-5 right-5 p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-colors">
              <X size={18} />
            </button>
            <h2 className="text-xl font-display font-black text-white uppercase tracking-tighter italic mb-6">
              AI Offer <span className="text-emerald-400">Generation</span>
            </h2>

            {!offerPreview ? (
              <form onSubmit={handleGenerateOffer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Role Title</label>
                    <input required type="text" value={offerDetails.role_title} onChange={e => setOfferDetails({...offerDetails, role_title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Salary</label>
                    <input required type="text" value={offerDetails.salary} onChange={e => setOfferDetails({...offerDetails, salary: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Department</label>
                    <input type="text" value={offerDetails.department} onChange={e => setOfferDetails({...offerDetails, department: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Location</label>
                    <input type="text" value={offerDetails.location} onChange={e => setOfferDetails({...offerDetails, location: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Start Date</label>
                    <input type="date" value={offerDetails.start_date} onChange={e => setOfferDetails({...offerDetails, start_date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/40" />
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
                  <button type="submit" disabled={generatingOffer} className="px-6 py-3 rounded-xl bg-emerald-400 text-black text-xs font-black uppercase tracking-widest hover:bg-emerald-300 transition-colors flex items-center gap-2">
                    {generatingOffer ? <Loader2 size={16} className="animate-spin"/> : 'Generate Preview'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <textarea 
                    value={offerPreview} 
                    onChange={e => setOfferPreview(e.target.value)} 
                    className="w-full h-[400px] bg-transparent text-sm text-white/90 outline-none resize-none font-mono"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setOfferPreview(null)} className="px-4 py-3 rounded-xl bg-white/5 text-white/70 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
                    Edit Details
                  </button>
                  <button onClick={handleCreateOffer} disabled={creatingOffer} className="px-6 py-3 rounded-xl bg-emerald-400 text-black text-xs font-black uppercase tracking-widest hover:bg-emerald-300 transition-colors flex items-center gap-2">
                    {creatingOffer ? <Loader2 size={16} className="animate-spin"/> : 'Send to HR for Approval'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
