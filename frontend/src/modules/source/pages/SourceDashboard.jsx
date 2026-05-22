import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Upload, Trash2, MapPin, Zap, Database, Shield,
  CheckSquare, Loader2, Download, X, AlertTriangle, Mail,
  ArrowUpRight, Plus, Send, Star, Filter, Users, ChevronDown,
  RefreshCw, Briefcase, Clock, CheckCircle, UserCheck,
  TrendingUp, PieChart, Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import CandidateDrawer from './CandidateDrawer';
import OfferApprovals from './OfferApprovals';
import ActiveCandidates from './ActiveCandidates';
import InviteStatus from './InviteStatus';

import "../../../styles/light-theme-override.css";
import logo from "../../../assets/phy360.png";
import bellIcon from "../../../assets/bell.png";
import logoutIcon from "../../../assets/exit.png";
import { MODULE_CONFIG } from "../../../core/config/modules";

const SCORE_COLOR = (s) => {
  if (!s && s !== 0) return 'text-white/30 bg-white/5 border-white/5';
  if (s >= 80) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (s >= 60) return 'text-primary bg-primary/10 border-primary/20';
  return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
};

const STATUS_STYLE = {
  active:      'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  shortlisted: 'bg-primary/10 text-primary border-primary/20',
  invited:     'bg-indigo/10 text-indigo border-indigo/20',
  hired:       'bg-secondary/10 text-secondary border-secondary/20',
  rejected:    'bg-rose-400/10 text-rose-400 border-rose-400/20',
};

const initFilters = { pool: 'all', location: '', min_exp: 0, sort_by: 'newest', role_id: '', limit: 20 };

export default function SourceDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const query = new URLSearchParams(location.search);
  const currentTab = query.get('tab') || 'home';

  const { user, hasPermission, logout } = useAuth();
  const displayName = user?.name || user?.email?.split('@')[0] || "User";

  const appModules = Object.entries(MODULE_CONFIG)
    .filter(([_, config]) => hasPermission?.(config.permission))
    .map(([key, config]) => ({
      id: key,
      name: config.label,
      path: config.route,
    }));

  const isCandidate = hasRole('candidate');

  if (!hasRole(['super_admin', 'org_admin', 'manager']) && !isCandidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <Shield size={48} className="text-secondary/20" />
        <div>
          <h2 className="text-xl font-display font-black text-white uppercase italic">Security Clearance Required</h2>
          <p className="text-xs text-white/30 uppercase tracking-widest mt-1">You do not have 'Elevated' clearance for this node.</p>
        </div>
      </div>
    );
  }

  if (isCandidate) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        <div className="section-card p-10 border-white/5 relative overflow-hidden bg-[#060E20]/50">
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary/10 rounded-full blur-[80px]"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-4">Candidate Portal // Phygitron Source</p>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">Application <span className="text-primary">Status</span></h1>
          
          <div className="mt-10 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary font-display font-black text-2xl">
              {user?.name?.[0] || 'C'}
            </div>
            <div>
              <p className="text-lg font-bold text-white uppercase tracking-tight">{user?.name}</p>
              <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Identity Verified • Application Processing</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="section-card p-8 border-white/5">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-6 flex items-center gap-3">
               <Activity size={16} className="text-primary" /> Active Pipeline
            </h3>
            <div className="space-y-4">
               <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white mb-1">Resume Screening</p>
                    <p className="text-[10px] uppercase text-white/30">Stage 1</p>
                  </div>
                  <CheckCircle className="text-emerald-400" size={20} />
               </div>
               <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white mb-1 text-primary">Pre-Employment Assessment</p>
                    <p className="text-[10px] uppercase text-primary/60">Stage 2 • Action Required</p>
                  </div>
                  <button onClick={() => navigate('/verify')} className="px-4 py-2 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-lg">Start</button>
               </div>
               <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center opacity-40">
                  <div>
                    <p className="text-xs font-bold text-white mb-1">Technical Interview</p>
                    <p className="text-[10px] uppercase text-white/30">Stage 3</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border border-white/20" />
               </div>
            </div>
          </div>

          <div className="section-card p-8 border-white/5">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-6 flex items-center gap-3">
               <Database size={16} className="text-primary" /> My Profile
            </h3>
            <p className="text-xs text-white/40 leading-relaxed mb-6">
              Your profile is currently being reviewed by our neural matching engine. Ensure your skills are up to date for maximum compatibility.
            </p>
            <div className="space-y-3">
               <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/60">
                  <span>Compatibility Score</span>
                  <span className="text-primary">Scanning...</span>
               </div>
               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary/30 w-1/3 animate-shimmer"></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [candidates, setCandidates] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [drawerCandidate, setDrawerCandidate] = useState(null);

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [rankingRoleId, setRankingRoleId] = useState(null);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [autoRanking, setAutoRanking] = useState(false);

  // Invite-status tab: role selector
  const [inviteStatusRoleId, setInviteStatusRoleId] = useState('');
  const [showInviteStatus, setShowInviteStatus] = useState(false);

  // Form states
  const [uploading, setUploading] = useState(false);
  const [newRole, setNewRole] = useState({ title: '', description: '', min_experience: 0 });
  const [inviteForm, setInviteForm] = useState({ role_id: '' });
  const [convertForm, setConvertForm] = useState({ candidate_id: '', employee_code: '', doj: '' });
  const [scoreRoleId, setScoreRoleId] = useState('');
  const [scoring, setScoring] = useState(false);

  const fileRef = useRef();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchJobRoles = useCallback(async () => {
    try {
      const r = await fetch('/api/source/job-roles', { credentials: 'include' });
      const d = await r.json();
      setJobRoles(d.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.pool !== 'all') params.set('pool', filters.pool);
      if (filters.location) params.set('location', filters.location);
      if (filters.min_exp > 0) params.set('min_exp', filters.min_exp);
      params.set('sort_by', filters.sort_by);
      params.set('limit', filters.limit);
      if (filters.role_id) params.set('role_id', filters.role_id);

      const r = await fetch(`/api/source/candidates/search?${params}`, { credentials: 'include' });
      const d = await r.json();
      setCandidates(d.data || []);
    } catch {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchJobRoles(); }, [fetchJobRoles]);
  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggle = (id) => setSelectedIds(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });
  const toggleAll = () =>
    setSelectedIds(selectedIds.size === candidates.length ? new Set() : new Set(candidates.map(c => c.id)));
  const clearSel = () => setSelectedIds(new Set());

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/source/candidates/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok) {
        toast.success(`Parsed: ${d.parsed_data?.full_name || 'new candidate'}`);
        fetchCandidates();
        setShowUpload(false);
        if (currentTab === 'upload') navigate('/source?tab=directory');
      } else {
        toast.error(d.detail || 'Upload failed');
      }
    } catch { toast.error('Upload interrupted'); }
    finally { setUploading(false); fileRef.current.value = ''; }
  };

  // ── Create job role ────────────────────────────────────────────────────────
  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      const r = await fetch('/api/source/job-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      });
      if (r.ok) {
        toast.success('Role created');
        setShowNewRole(false);
        setNewRole({ title: '', description: '', min_experience: 0 });
        fetchJobRoles();
      } else { toast.error('Failed to create role'); }
    } catch { toast.error('Error'); }
  };

  // ── Bulk AI score ──────────────────────────────────────────────────────────
  const handleScore = async (e) => {
    e.preventDefault();
    if (!scoreRoleId) return toast.error('Select a role');
    setScoring(true);
    try {
      const r = await fetch('/api/source/score-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: parseInt(scoreRoleId), candidate_ids: [...selectedIds] }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success(`Scored ${d.data.length} candidates`);
        setShowScore(false);
        clearSel();
        fetchCandidates();
      } else { toast.error(d.detail || 'Scoring failed'); }
    } catch { toast.error('Scoring interrupted'); }
    finally { setScoring(false); }
  };

  // ── Send invite ────────────────────────────────────────────────────────────
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.role_id) return toast.error('Select a role');
    const ids = [...selectedIds];
    let ok = 0;
    for (const cid of ids) {
      try {
        const r = await fetch('/api/source/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_id: cid, role_id: parseInt(inviteForm.role_id) }),
        });
        if (r.ok) ok++;
      } catch { /* skip */ }
    }
    toast.success(`Invited ${ok} of ${ids.length} candidates`);
    setShowInvite(false);
    clearSel();
    fetchCandidates();
  };

  // ── Convert to employee ────────────────────────────────────────────────────
  const handleConvert = async (e) => {
    e.preventDefault();
    try {
      const r = await fetch('/api/source/convert-to-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: parseInt(convertForm.candidate_id),
          employee_code: convertForm.employee_code,
          doj: convertForm.doj,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success('Candidate converted to employee!');
        setShowConvert(false);
        setConvertForm({ candidate_id: '', employee_code: '', doj: '' });
        fetchCandidates();
        setDrawerCandidate(null);
      } else { toast.error(d.detail || 'Conversion failed'); }
    } catch { toast.error('Conversion interrupted'); }
  };

  const fetchRankings = async (roleId) => {
    setRankingRoleId(roleId);
    setLoadingRankings(true);
    setShowRankings(true);
    try {
      const r = await fetch(`/api/source/job-roles/${roleId}/rankings`);
      const d = await r.json();
      if (r.ok) {
        setRankings(d.data || []);
      } else {
        toast.error('Failed to load rankings');
        setShowRankings(false);
      }
    } catch {
      toast.error('Network error');
      setShowRankings(false);
    } finally {
      setLoadingRankings(false);
    }
  };

  const handleAutoRank = async () => {
    if (!rankingRoleId) return;
    setAutoRanking(true);
    const tid = toast.loading('AI is scanning all resumes for this role...');
    try {
      const r = await fetch(`/api/source/job-roles/${rankingRoleId}/auto-rank`, { method: 'POST' });
      if (r.ok) {
        toast.success('Auto-ranking complete!', { id: tid });
        fetchRankings(rankingRoleId);
      } else {
        toast.error('Auto-ranking failed', { id: tid });
      }
    } catch {
      toast.error('Process interrupted', { id: tid });
    } finally {
      setAutoRanking(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this candidate permanently?')) return;
    try {
      await fetch(`/api/source/candidates/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      if (drawerCandidate?.id === id) setDrawerCandidate(null);
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
      fetchCandidates();
    } catch { toast.error('Delete failed'); }
  };

  const anySelected = selectedIds.size > 0;
  const allSelected = candidates.length > 0 && selectedIds.size === candidates.length;

  const setTab = (tab) => navigate(`/source?tab=${tab}`);

  return (
    <div className="dashboard-page light-theme-override">
      <div className="topbar">
        <div className="top-left">
          <img src={logo} className="logo" alt="logo" />
        </div>
        <div className="top-center">
          <div className="hub-tabs">
            {appModules.map((m) => (
              <button
                key={m.id}
                className={`hub-tab ${location.pathname.startsWith(m.path) ? "active" : ""}`}
                onClick={() => navigate(m.path)}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="top-right">
          <img src={bellIcon} className="icon" alt="bell" />
          <img
            src={logoutIcon}
            className="icon logout-icon"
            alt="logout"
            onClick={() => { logout(); navigate('/login'); }}
          />
          <div className="profile-wrap">
            <div className="avatar">{displayName?.charAt(0)?.toUpperCase()}</div>
            <div className="profile-text">
              <h4>{displayName}</h4>
              <p>Organisation Admin</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-body">
        <div className="sidebar">
          <button className={currentTab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>Home</button>
          <button className={currentTab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>Jobs</button>
          <button className={currentTab === 'directory' ? 'active' : ''} onClick={() => setTab('directory')}>Directory</button>
          <button className={currentTab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}>Upload</button>
          <button className={currentTab === 'offers' ? 'active' : ''} onClick={() => setTab('offers')}>Offer Approvals</button>
          <button className={currentTab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Active Pipeline</button>
          <button className={currentTab === 'invite-status' ? 'active' : ''} onClick={() => setTab('invite-status')}>Invite Status</button>
        </div>
        
        <div className="content">
          <div className="flex flex-col gap-6 h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-black text-white tracking-tighter uppercase italic">
            {currentTab === 'upload' ? (
              <>AI Ingest <span className="text-primary">Engine</span></>
            ) : currentTab === 'jobs' ? (
              <>Job <span className="text-primary">Roles</span></>
            ) : currentTab === 'home' ? (
              <>Source <span className="text-primary">Hub</span></>
            ) : currentTab === 'offers' ? (
              <>Offer <span className="text-primary">Approvals</span></>
            ) : currentTab === 'active' ? (
              <>Active <span className="text-primary">Candidates</span></>
            ) : currentTab === 'invite-status' ? (
              <>Invite <span className="text-primary">Status</span></>
            ) : (
              <>Candidate <span className="text-primary">Directory</span></>
            )}
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">
            {currentTab === 'upload'
              ? 'Quantum Resume Parsing'
              : currentTab === 'jobs'
              ? `${jobRoles.length} active roles`
              : currentTab === 'offers' || currentTab === 'active' || currentTab === 'invite-status'
              ? 'Phygitron 360 Source'
              : `${candidates.length} records`} · Phygitron 360 Source
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(currentTab === 'directory' || currentTab === 'home' || currentTab === 'jobs') && (
            <button
              onClick={() => { fetchCandidates(); fetchJobRoles(); }}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150"
            >
              <RefreshCw size={16} />
            </button>
          )}

          {currentTab === 'directory' && (
            <>
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-colors duration-150 ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                <Filter size={15} /> Filters
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors duration-150 shadow-lg"
              >
                <Upload size={15} /> Upload Resume
              </button>
            </>
          )}

          {currentTab === 'jobs' && (
            <button
              onClick={() => setShowNewRole(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo text-white text-[11px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors duration-150 shadow-lg"
            >
              <Plus size={15} /> Add Job Role
            </button>
          )}

          {currentTab === 'invite-status' && jobRoles.length > 0 && (
            <div className="flex items-center gap-3">
              <select
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
                value={inviteStatusRoleId}
                onChange={e => { setInviteStatusRoleId(e.target.value); setShowInviteStatus(false); }}
              >
                <option value="">Select a role...</option>
                {jobRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
              {inviteStatusRoleId && (
                <button
                  onClick={() => setShowInviteStatus(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors duration-150"
                >
                  View Invites
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Tab Content ── */}
      {currentTab === 'home' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-4 gap-6">
            <div className="section-card p-6 border-l-2 border-primary/50 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={64}/></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total Candidates</p>
               <h2 className="text-4xl font-display font-black text-white">{candidates.length}</h2>
               <div className="flex items-center gap-1 mt-4 text-[10px] text-emerald-400 font-bold"><TrendingUp size={12}/> Live Database</div>
            </div>
            <div className="section-card p-6 border-l-2 border-indigo/50 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Briefcase size={64}/></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Active Roles</p>
               <h2 className="text-4xl font-display font-black text-white">{jobRoles.length}</h2>
               <div className="flex items-center gap-1 mt-4 text-[10px] text-indigo font-bold"><Activity size={12}/> Requisitions</div>
            </div>
            <div className="section-card p-6 border-l-2 border-secondary/50 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle size={64}/></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Hired Talent</p>
               <h2 className="text-4xl font-display font-black text-white">{candidates.filter(c => c.status?.toLowerCase() === 'hired').length}</h2>
               <div className="flex items-center gap-1 mt-4 text-[10px] text-secondary font-bold"><TrendingUp size={12}/> Converted</div>
            </div>
            <div className="section-card p-6 border-l-2 border-emerald-400/50 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Star size={64}/></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Scored Profiles</p>
               <h2 className="text-4xl font-display font-black text-white">{candidates.filter(c => c.fit_score != null).length}</h2>
               <div className="flex items-center gap-1 mt-4 text-[10px] text-emerald-400 font-bold"><Star size={12}/> AI Analyzed</div>
            </div>
          </div>

          {/* Pipeline Funnel */}
          <div className="section-card p-6">
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-6"><PieChart size={14}/> Talent Pipeline Status</h3>
            <div className="flex gap-2 h-12 rounded-xl overflow-hidden shadow-inner">
               {['New', 'Shortlisted', 'Invited', 'Hired', 'Rejected'].map(status => {
                 const count = candidates.filter(c => (c.status || 'New').toLowerCase() === status.toLowerCase()).length;
                 const percent = candidates.length > 0 ? (count / candidates.length) * 100 : 0;
                 if (count === 0) return null;
                 const colors = {
                    'new': 'bg-white/10',
                    'shortlisted': 'bg-primary/50',
                    'invited': 'bg-indigo/50',
                    'hired': 'bg-secondary/50',
                    'rejected': 'bg-error/50'
                 };
                 return (
                   <div key={status} style={{ width: `${percent}%` }} className={`${colors[status.toLowerCase()]} h-full transition-all duration-500 relative group flex items-center justify-center`}>
                      {percent > 5 && <span className="text-[10px] font-black mix-blend-overlay text-white">{count}</span>}
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-black border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white whitespace-nowrap z-10 transition-opacity pointer-events-none">
                        {status}: {count} ({Math.round(percent)}%)
                      </div>
                   </div>
                 );
               })}
               {candidates.length === 0 && <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs text-white/30 font-bold uppercase tracking-widest">No Pipeline Data</div>}
            </div>
            <div className="flex flex-wrap items-center gap-6 mt-6">
               {[
                 { label: 'New', color: 'bg-white/20' },
                 { label: 'Shortlisted', color: 'bg-primary/50' },
                 { label: 'Invited', color: 'bg-indigo/50' },
                 { label: 'Hired', color: 'bg-secondary/50' },
                 { label: 'Rejected', color: 'bg-error/50' },
               ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                    <div className={`w-3 h-3 rounded-sm ${s.color}`} /> {s.label}
                  </div>
               ))}
            </div>
          </div>
        </div>
      ) : currentTab === 'jobs' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {jobRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center section-card">
              <Briefcase size={48} className="text-white/10" />
              <div>
                <p className="text-base font-bold text-white mb-1">No active roles</p>
                <p className="text-xs text-white/30">Click Add Role to define a job requisition</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {jobRoles.map(r => (
                <div key={r.id} className="section-card p-6 border-white/5 hover:border-primary/30 transition-colors flex flex-col items-start text-left">
                  <h3 className="text-lg font-bold text-white">{r.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/80 mt-1 mb-4">Min Exp: {r.min_experience} yrs</p>
                   <p className="text-xs text-white/40 leading-relaxed line-clamp-3 mb-4">{r.description || 'No description provided.'}</p>
                  <button 
                    onClick={() => fetchRankings(r.id)}
                    className="mt-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
                  >
                    View Ranking Leaderboard <ArrowUpRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : currentTab === 'upload' ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="section-card w-full max-w-xl p-10 relative">
              <h2 className="text-2xl font-display font-black text-white mb-8 uppercase tracking-widest flex items-center gap-2"><Upload size={24} className="text-primary"/> Inject Resume</h2>
              <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group flex flex-col items-center cursor-pointer" onClick={() => !uploading && fileRef.current.click()}>
                <input type="file" ref={fileRef} onChange={handleUpload} className="hidden" accept=".pdf,.doc,.docx,.txt" />
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {uploading ? <Loader2 size={32} className="text-primary animate-spin" /> : <Upload size={32} className="text-primary" />}
                </div>
                <p className="text-white font-bold text-lg mb-2">{uploading ? 'Quantum Parsing in Progress...' : 'Drop file here or click'}</p>
                <p className="text-sm text-white/40">Supported formats: PDF, DOCX, TXT</p>
                <button disabled={uploading} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-colors">Select Local File</button>
              </div>
            </div>
        </div>
      ) : currentTab === 'offers' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <OfferApprovals />
        </div>
      ) : currentTab === 'active' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ActiveCandidates />
        </div>
      ) : currentTab === 'invite-status' ? (
        <div className="flex-1 flex items-center justify-center">
          {!inviteStatusRoleId ? (
            <div className="section-card flex flex-col items-center justify-center gap-4 py-16 px-12 text-center border-white/5 max-w-md w-full">
              <Briefcase size={40} className="text-white/10" />
              <div>
                <p className="text-base font-bold text-white mb-1">Select a Job Role</p>
                <p className="text-xs text-white/30">Choose a role from the dropdown above to view invite tracking.</p>
              </div>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors mt-2"
                value={inviteStatusRoleId}
                onChange={e => { setInviteStatusRoleId(e.target.value); setShowInviteStatus(e.target.value !== ''); }}
              >
                <option value="">Select a role...</option>
                {jobRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Role selected. Click <span className="text-primary">View Invites</span> in the header.</p>
            </div>
          )}
          {showInviteStatus && inviteStatusRoleId && (
            <InviteStatus
              roleId={inviteStatusRoleId}
              roleName={jobRoles.find(r => String(r.id) === String(inviteStatusRoleId))?.title}
              onClose={() => setShowInviteStatus(false)}
            />
          )}
        </div>
      ) : (
        <>
          {/* ── Filter Bar ── */}
          {showFilters && (
        <div className="section-card p-5 flex flex-wrap gap-4 items-end shrink-0">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Job Role</label>
            <div className="flex items-center gap-2">
              <select
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
                value={filters.role_id}
                onChange={e => setFilters(f => ({ ...f, role_id: e.target.value }))}
              >
                <option value="">All Roles</option>
                {jobRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Pool</label>
            <select
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
              value={filters.pool}
              onChange={e => setFilters(f => ({ ...f, pool: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="candidate">Candidates</option>
              <option value="trainee">Trainees</option>
              <option value="employee">Employees</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Min. Experience (yrs)</label>
            <input
              type="number" min={0} max={30}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors w-36"
              value={filters.min_exp}
              onChange={e => setFilters(f => ({ ...f, min_exp: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Location</label>
            <input
              type="text" placeholder="City or Remote"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
              value={filters.location}
              onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Sort By</label>
            <select
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
              value={filters.sort_by}
              onChange={e => setFilters(f => ({ ...f, sort_by: e.target.value }))}
            >
              <option value="newest">Newest</option>
              <option value="experience">Experience</option>
              {filters.role_id && <option value="fit_score">Fit Score</option>}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Show</label>
            <select
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
              value={filters.limit}
              onChange={e => setFilters(f => ({ ...f, limit: parseInt(e.target.value) }))}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <button
            onClick={fetchCandidates}
            className="px-6 py-2.5 bg-primary text-black rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors duration-150"
          >
            Apply
          </button>
          <button
            onClick={() => setFilters(initFilters)}
            className="px-5 py-2.5 text-white/40 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:text-white transition-colors duration-150"
          >
            Reset
          </button>
        </div>
      )}

      {/* ── Candidate Table ── */}
      <div className="section-card flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_110px_100px_120px_110px_56px] gap-4 px-6 py-4 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 shrink-0">
          <div className="flex items-center justify-center">
            <button
              onClick={toggleAll}
              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${allSelected ? 'bg-primary border-primary text-black' : 'border-white/20 hover:border-primary/50'}`}
            >
              {allSelected && <CheckSquare size={12} />}
            </button>
          </div>
          <div>Candidate</div>
          <div className="text-center">AI Fit Score</div>
          <div className="text-center">Experience</div>
          <div className="text-center">Status</div>
          <div>Location</div>
          <div />
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5" style={{ overscrollBehavior: 'contain' }}>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-white/40">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest">Syncing directory...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <Database size={48} className="text-white/10" />
              <div>
                <p className="text-base font-bold text-white mb-1">Directory is empty</p>
                <p className="text-xs text-white/30">Upload resumes to get started</p>
              </div>
            </div>
          ) : (
            candidates.map(c => (
              <div
                key={c.id}
                onClick={() => setDrawerCandidate(c)}
                className={`grid grid-cols-[40px_1fr_110px_100px_120px_110px_56px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors duration-150 group ${drawerCandidate?.id === c.id ? 'bg-primary/5' : 'hover:bg-white/[0.02]'}`}
              >
                {/* Checkbox */}
                <div className="flex items-center justify-center" onClick={e => { e.stopPropagation(); toggle(c.id); }}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedIds.has(c.id) ? 'bg-primary border-primary text-black' : 'border-white/20 hover:border-primary/50'}`}>
                    {selectedIds.has(c.id) && <CheckSquare size={12} />}
                  </div>
                </div>

                {/* Identity */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-display font-black text-sm text-white group-hover:border-primary/30 transition-colors shrink-0">
                    {(c.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{c.full_name || '—'}</p>
                    <p className="text-[10px] text-white/30 truncate">{c.email}</p>
                  </div>
                </div>

                {/* Score */}
                <div className="flex justify-center">
                  <span className={`px-3 py-1 rounded-lg border text-sm font-black ${SCORE_COLOR(c.fit_score)}`}>
                    {c.fit_score != null ? `${Math.round(c.fit_score)}%` : '—'}
                  </span>
                </div>

                {/* Exp */}
                <div className="text-center">
                  <span className="text-sm font-bold text-white">{c.total_experience_years ?? '—'} yrs</span>
                </div>

                {/* Status */}
                <div className="flex justify-center">
                  <span className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${STATUS_STYLE[c.status?.toLowerCase()] || 'bg-white/5 border-white/10 text-white/40'}`}>
                    {c.status || 'New'}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-white/40 min-w-0">
                  <MapPin size={12} className="shrink-0" />
                  <span className="text-[11px] truncate">{c.location || 'N/A'}</span>
                </div>

                {/* Delete */}
                <div className="flex justify-center" onClick={e => handleDelete(c.id, e)}>
                  <button className="p-2 rounded-lg text-rose-400/30 hover:text-rose-400 hover:bg-rose-400/10 transition-colors duration-150 opacity-0 group-hover:opacity-100">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </>
      )}

      {/* ── Bulk Action Bar ── */}
      {anySelected && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-8 py-4 section-card border-primary/20 shadow-2xl">
          <span className="text-xs font-black text-primary uppercase tracking-widest">{selectedIds.size} selected</span>
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={() => setShowScore(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors duration-150"
          >
            <Star size={14} /> Score vs Role
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo/10 hover:border-indigo/30 hover:text-indigo transition-colors duration-150"
          >
            <Send size={14} /> Send Invite
          </button>
          {selectedIds.size === 1 && (
            <button
              onClick={() => {
                setConvertForm(f => ({ ...f, candidate_id: [...selectedIds][0] }));
                setShowConvert(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[11px] font-black uppercase tracking-widest hover:bg-emerald-400/20 transition-colors duration-150"
            >
              <UserCheck size={14} /> Convert to Employee
            </button>
          )}
          <button onClick={clearSel} className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors duration-150">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Candidate Profile Drawer ── */}
      <CandidateDrawer
        candidate={drawerCandidate}
        jobRoles={jobRoles}
        onClose={() => setDrawerCandidate(null)}
        onRefresh={fetchCandidates}
        onConvert={(cid) => { setConvertForm(f => ({ ...f, candidate_id: cid })); setShowConvert(true); }}
      />

      {/* ── Upload Modal ── */}
      {showUpload && (
        <Modal onClose={() => setShowUpload(false)} title="Upload Resume">
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-6 w-full border-2 border-dashed border-white/10 rounded-2xl p-16 hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150 cursor-pointer"
          >
            {uploading ? (
              <><Loader2 size={40} className="text-primary animate-spin" /><p className="text-sm font-bold text-white">AI parsing resume...</p></>
            ) : (
              <><Upload size={40} className="text-primary/60" /><div><p className="text-base font-bold text-white mb-1">Click to select file</p><p className="text-xs text-white/30">PDF, DOCX, or TXT</p></div></>
            )}
          </button>
        </Modal>
      )}

      {/* ── New Role Modal ── */}
      {showNewRole && (
        <Modal onClose={() => setShowNewRole(false)} title="Create Job Role">
          <form onSubmit={handleCreateRole} className="flex flex-col gap-5">
            <Field label="Role Title *">
              <input required className="form-input" placeholder="e.g. Senior Backend Engineer" value={newRole.title} onChange={e => setNewRole(r => ({ ...r, title: e.target.value }))} />
            </Field>
            <Field label="Description">
              <textarea rows={3} className="form-input resize-none" placeholder="Describe requirements..." value={newRole.description} onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))} />
            </Field>
            <Field label="Min. Experience (years)">
              <input type="number" min={0} className="form-input" value={newRole.min_experience} onChange={e => setNewRole(r => ({ ...r, min_experience: parseInt(e.target.value) || 0 }))} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowNewRole(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
              <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors">Create Role</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Score Modal ── */}
      {showScore && (
        <Modal onClose={() => setShowScore(false)} title={`Score ${selectedIds.size} candidate${selectedIds.size > 1 ? 's' : ''}`}>
          <form onSubmit={handleScore} className="flex flex-col gap-5">
            <p className="text-xs text-white/40">Run AI fit analysis for selected candidates against a job role.</p>
            <Field label="Job Role *">
              <select required className="form-input" value={scoreRoleId} onChange={e => setScoreRoleId(e.target.value)}>
                <option value="">Select role...</option>
                {jobRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowScore(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
              <button type="submit" disabled={scoring} className="flex-1 py-3 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50">
                {scoring ? 'Scoring...' : 'Run AI Score'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Invite Modal ── */}
      {showInvite && (
        <Modal onClose={() => setShowInvite(false)} title={`Invite ${selectedIds.size} candidate${selectedIds.size > 1 ? 's' : ''}`}>
          <form onSubmit={handleInvite} className="flex flex-col gap-5">
            <Field label="Job Role *">
              <select required className="form-input" value={inviteForm.role_id} onChange={e => setInviteForm(f => ({ ...f, role_id: e.target.value }))}>
                <option value="">Select role...</option>
                {jobRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
              <button type="submit" className="flex-1 py-3 rounded-xl bg-indigo text-white text-xs font-black uppercase tracking-widest hover:bg-indigo/80 transition-colors">Send Invites</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Convert to Employee Modal ── */}
      {showConvert && (
        <Modal onClose={() => setShowConvert(false)} title="Convert to Employee">
          <form onSubmit={handleConvert} className="flex flex-col gap-5">
            <p className="text-xs text-white/40">Creates an employee record in the Deploy module.</p>
            <Field label="Employee Code *">
              <input required className="form-input" placeholder="e.g. EMP-1042" value={convertForm.employee_code} onChange={e => setConvertForm(f => ({ ...f, employee_code: e.target.value }))} />
            </Field>
            <Field label="Date of Joining *">
              <input required type="date" className="form-input" value={convertForm.doj} onChange={e => setConvertForm(f => ({ ...f, doj: e.target.value }))} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowConvert(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
              <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-400 text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors">Confirm Hire</button>
            </div>
          </form>
        </Modal>
      )}

      {showRankings && (
        <Modal onClose={() => setShowRankings(false)} title={`Leaderboard: ${jobRoles.find(r => r.id === rankingRoleId)?.title}`}>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40">AI-Powered Fitment Ranking</p>
               <button 
                 disabled={autoRanking || loadingRankings}
                 onClick={handleAutoRank}
                 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all disabled:opacity-50"
               >
                 {autoRanking ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                 {autoRanking ? 'Ranking All...' : 'Auto-Rank All'}
               </button>
            </div>

            {loadingRankings ? (
              <div className="flex items-center justify-center py-24 text-white/40 gap-3">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">Retrieving Rankings...</span>
              </div>
            ) : rankings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 section-card border-white/5 bg-white/[0.02]">
                <Shield size={48} className="text-white/10 mb-6" />
                <div className="text-center max-w-xs">
                  <p className="text-sm font-bold text-white mb-2 uppercase italic">No Rankings Data</p>
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-8 leading-relaxed">
                    AI hasn't processed your candidate pool for this specific role yet.
                  </p>
                  <button 
                    onClick={handleAutoRank}
                    disabled={autoRanking}
                    className="w-full py-4 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg flex items-center justify-center gap-3"
                  >
                    {autoRanking ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    Initialize AI Auto-Rank
                  </button>
                </div>
              </div>
            ) : (
              rankings.map((cand, idx) => (
                <div key={cand.candidate_id} className="section-card p-4 flex items-center justify-between border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden">
                  {idx < 3 && <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />}
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-xs transition-colors ${idx === 0 ? 'bg-primary text-black' : idx < 3 ? 'bg-white/10 text-primary' : 'bg-white/5 text-white/40 group-hover:text-primary'}`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{cand.full_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                         <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{cand.current_designation || 'Position Unknown'}</p>
                         <div className="w-1 h-1 rounded-full bg-white/10" />
                         <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest">{cand.total_experience_years} Years Exp</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-xl border font-display font-black text-sm shadow-xl ${SCORE_COLOR(cand.score)}`}>
                      {Math.round(cand.score)}
                    </div>
                    <button 
                      onClick={() => {
                        setShowRankings(false);
                        const fullCand = candidates.find(c => c.id === cand.candidate_id);
                        setDrawerCandidate(fullCand || { id: cand.candidate_id, full_name: cand.full_name });
                      }}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
             <button onClick={() => setShowRankings(false)} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Close Intelligence Portal</button>
          </div>
        </Modal>
      )}
    </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────
function Modal({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg section-card p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[9px] font-black uppercase tracking-widest text-white/40">{label}</label>
      {children}
    </div>
  );
}
