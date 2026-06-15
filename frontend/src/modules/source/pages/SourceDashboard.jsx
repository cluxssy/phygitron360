import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Upload, Trash2, MapPin, Zap, Database, Shield,
  CheckSquare, Loader2, Download, X, AlertTriangle, Mail,
  ArrowUpRight, Plus, Send, Star, Filter, Users, ChevronDown,
  RefreshCw, Briefcase, Clock, CheckCircle, UserCheck,
  TrendingUp, PieChart, Activity, Edit, XCircle
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
import { getHubTabs } from "../../../core/navigation/hubTabs";

const SCORE_COLOR = (s) => {
  if (!s && s !== 0) return 'text-white/30 bg-white/5 border-white/5';
  if (s >= 80) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (s >= 60) return 'text-primary bg-primary/10 border-primary/20';
  return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
};

const STATUS_STYLE = {
  active:      'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  favourite: 'bg-primary/10 text-primary border-primary/20',
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

  const appModules = getHubTabs({ hasPermission, hasRole });

  // Dynamic role display based on actual user roles
  const getRoleDisplay = () => {
    if (hasRole?.('super_admin')) return 'Super Admin';
    if (hasRole?.('org_admin')) return 'Organisation Admin';
    if (hasRole?.('manager')) return 'Manager';
    if (hasRole?.('recruiter')) return 'Recruiter';
    return 'Employee';
  };

  const isCandidate = hasRole('candidate');

  if (!hasRole(['super_admin', 'org_admin', 'manager']) && !isCandidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <Shield size={48} className="text-secondary/20" />
        <div>
          <h2 className="text-xl font-display font-black text-white uppercase italic">Security Clearance Required</h2>
          <p className="text-xs text-white/30 uppercase tracking-widest mt-1">You do not have access to this module.</p>
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
              Your profile is being reviewed to find matching opportunities. Ensure your skills are current for the best matches.
            </p>
            <div className="space-y-3">
               <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/60">
                  <span>Compatibility Score</span>
                  <span className="text-primary">Searching...</span>
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
  
  const fileRef = useRef(null);
  const folderRef = useRef(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Activity feed state
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [autoRanking, setAutoRanking] = useState(false);

  // Invite-status tab: role selector
  const [inviteStatusRoleId, setInviteStatusRoleId] = useState('');
  const [showInviteStatus, setShowInviteStatus] = useState(false);

  // Form states
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkJobId, setBulkJobId] = useState(null);
  const [bulkJobProgress, setBulkJobProgress] = useState(null);
  const [newRole, setNewRole] = useState({ title: '', description: '', min_experience: 0 });
  const [inviteForm, setInviteForm] = useState({
    role_id: '',
    templateType: 'prebuilt',
    subject: '',
    custom_body: '',
  });
  const [scoreRoleId, setScoreRoleId] = useState('');
  const [scoring, setScoring] = useState(false);

  // fileRef moved up

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
      if (filters.role_id) {
        params.set('role_id', filters.role_id);
        params.set('limit', filters.limit);
      } else {
        params.set('limit', 1000); // Main directory shows everyone
      }

      const r = await fetch(`/api/source/candidates/search?${params}`, { credentials: 'include' });
      const d = await r.json();
      setCandidates(d.data || []);
    } catch {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const r = await fetch('/api/source/candidates/activity?limit=10', { credentials: 'include' });
      const d = await r.json();
      if (r.ok && d.success) {
        setActivities(d.data || []);
      }
    } catch { /* silent */ }
    finally { setLoadingActivities(false); }
  }, []);

  useEffect(() => { fetchJobRoles(); }, [fetchJobRoles]);
  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);
  useEffect(() => {
    if (currentTab === 'home') {
      fetchActivities();
    }
  }, [currentTab, fetchActivities]);

  // Resume tracking an active bulk upload job if we refresh the page
  useEffect(() => {
    const fetchActiveJob = async () => {
      try {
        const r = await fetch('/api/source/candidates/bulk-upload/active');
        if (r.ok) {
          const d = await r.json();
          if (d.success && d.data && d.data.job) {
            setBulkJobId(d.data.job.id);
            setBulkJobProgress(d.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch active bulk upload job', err);
      }
    };
    fetchActiveJob();
  }, []);

  // Poll bulk upload progress
  useEffect(() => {
    if (!bulkJobId) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/source/candidates/bulk-upload/${bulkJobId}`);
        const d = await r.json();
        if (r.ok && d.success) {
          setBulkJobProgress(d.data);
          // If all items are processed, stop polling
          const stats = d.data.items_stats || [];
          const totalProcessed = stats
            .filter(s => s.status !== 'pending' && s.status !== 'processing')
            .reduce((acc, curr) => acc + curr.count, 0);
          const job = d.data.job;
          if (job && job.total_files > 0 && totalProcessed >= job.total_files) {
             setBulkJobId(null);
             toast.success('Bulk processing complete');
             fetchCandidates();
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [bulkJobId, fetchCandidates]);

  // ── Filter candidates client-side ──
  const filteredCandidates = candidates.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = c.full_name?.toLowerCase().includes(term);
    const emailMatch = c.email?.toLowerCase().includes(term);
    const designationMatch = c.current_designation?.toLowerCase().includes(term);
    const locationMatch = c.location?.toLowerCase().includes(term);
    const skillStrings = [
      ...(Array.isArray(c.skills) ? c.skills : []),
      ...(Array.isArray(c.structured_skills) ? c.structured_skills.map(s => s.skill_name || s.name) : [])
    ];
    const skillMatch = skillStrings.some(s => s?.toLowerCase().includes(term));
    return nameMatch || emailMatch || designationMatch || locationMatch || skillMatch;
  });

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggle = (id) => setSelectedIds(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });
  const allSelected = filteredCandidates.length > 0 && filteredCandidates.every(c => selectedIds.has(c.id));
  
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredCandidates.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredCandidates.forEach(c => next.add(c.id));
        return next;
      });
    }
  };
  const clearSel = () => setSelectedIds(new Set());

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    const validExtensions = ['.pdf', '.doc', '.docx', '.txt', '.zip'];
    let validCount = 0;
    for (let i = 0; i < files.length; i++) {
        const name = files[i].name.toLowerCase();
        if (validExtensions.some(ext => name.endsWith(ext))) {
            const cleanFile = new File([files[i]], files[i].name, { type: files[i].type });
            fd.append('files', cleanFile);
            validCount++;
        }
    }
    if (validCount === 0) {
        toast.error('No supported files found (PDF, DOCX, TXT, ZIP)');
        setUploading(false);
        if (e.target) e.target.value = '';
        return;
    }
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/source/candidates/bulk-upload');
        xhr.withCredentials = true;
        xhr.onload = () => {
          try {
            const d = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              toast.success(d.message || `Queued ${validCount} file(s) for AI processing!`);
              if (d.data?.job_id) {
                setBulkJobId(d.data.job_id);
                setBulkJobProgress(null);
              }
              setShowUpload(false);
              resolve();
            } else {
              toast.error(d.detail || 'Upload failed');
              reject(new Error(d.detail || 'Upload failed'));
            }
          } catch { reject(new Error('Invalid server response')); }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(fd);
      });
    } catch (err) { toast.error('Upload error: ' + (err?.message || 'Unknown')); }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    await handleUpload(e);
  };

  const handleCancelQueue = async () => {
    if (!bulkJobId) return;
    try {
      const r = await fetch(`/api/source/candidates/bulk-upload/${bulkJobId}/cancel`, { 
        method: 'POST', 
        credentials: 'include' 
      });
      if (r.ok) {
        toast.success('Queue cancelled successfully');
        setBulkJobId(null);
        setBulkJobProgress(null);
      } else {
        toast.error('Failed to cancel queue');
      }
    } catch {
      toast.error('Error cancelling queue');
    }
  };

  // ── Create / Edit job role ────────────────────────────────────────────────────────
  const handleSaveRole = async (e) => {
    e.preventDefault();
    const isEdit = !!newRole.id;
    const url = isEdit ? `/api/source/job-roles/${newRole.id}` : '/api/source/job-roles';
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      });
      if (r.ok) {
        toast.success(isEdit ? 'Role updated' : 'Role created');
        setShowNewRole(false);
        setNewRole({ title: '', description: '', min_experience: 0 });
        fetchJobRoles();
      } else { toast.error(`Failed to ${isEdit ? 'update' : 'create'} role`); }
    } catch { toast.error('Error saving role'); }
  };

  const openEditRole = (role) => {
    setNewRole({
      id: role.id,
      title: role.title,
      description: role.description || '',
      min_experience: role.min_experience || 0
    });
    setShowNewRole(true);
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
    
    const payload = {
      candidate_ids: ids,
      job_role_id: parseInt(inviteForm.role_id),
    };
    
    if (inviteForm.templateType === 'custom') {
      if (inviteForm.subject) payload.subject = inviteForm.subject;
      if (inviteForm.custom_body) payload.custom_body = inviteForm.custom_body;
    }

    const tid = toast.loading('Sending invites...');
    try {
      const r = await fetch('/api/source/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success(d.message || `Invited ${ids.length} candidate(s)!`, { id: tid });
        setShowInvite(false);
        clearSel();
        fetchCandidates();
        fetchActivities();
      } else {
        toast.error(d.detail || 'Invitation failed', { id: tid });
      }
    } catch {
      toast.error('Invitation error', { id: tid });

    }
  };

  const handleCancelInvite = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to cancel the invite for ${ids.length} candidate(s)? This will unlink their user account if they are a trainee and convert them back to an active candidate.`)) return;

    const tid = toast.loading('Cancelling invites...');
    try {
      const r = await fetch('/api/source/cancel-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_ids: ids }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success(d.message || `Cancelled invites for ${ids.length} candidate(s)!`, { id: tid });
        clearSel();
        fetchCandidates();
        fetchActivities();
      } else {
        toast.error(d.detail || 'Cancel failed', { id: tid });
      }
    } catch {
      toast.error('Cancel error', { id: tid });
    }
  };


  const handleAutoRank = async (roleId) => {
    if (!roleId) return;
    setAutoRanking(true);
    const tid = toast.loading('Searching through resumes for matches...');
    try {
      const r = await fetch(`/api/source/job-roles/${roleId}/auto-rank`, { method: 'POST' });
      if (r.ok) {
        toast.success('Auto-ranking complete!', { id: tid });
        if (filters.role_id === roleId) fetchCandidates();
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
              <p>{getRoleDisplay()}</p>
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
              ? `${user?.company_name || 'Source'} · Talent Acquisition`
              : `${searchTerm ? `${filteredCandidates.length} of ` : ''}${candidates.length} records · ${user?.company_name || 'Source'}`}
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
              <div className="relative w-64 md:w-80">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/40">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Search name, email, role, skills..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-primary/40 focus:bg-white/[0.08] transition-all"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
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
              onClick={() => { setNewRole({ title: '', description: '', min_experience: 0 }); setShowNewRole(true); }}
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
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Zap size={64}/></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Favourite</p>
               <h2 className="text-4xl font-display font-black text-white">{candidates.filter(c => c.status?.toLowerCase() === 'favourite').length}</h2>
               <div className="flex items-center gap-1 mt-4 text-[10px] text-indigo font-bold"><Activity size={12}/> Pipeline</div>
            </div>
            <div className="section-card p-6 border-l-2 border-secondary/50 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Mail size={64}/></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Invited</p>
               <h2 className="text-4xl font-display font-black text-white">{candidates.filter(c => c.status?.toLowerCase() === 'invited').length}</h2>
               <div className="flex items-center gap-1 mt-4 text-[10px] text-secondary font-bold"><TrendingUp size={12}/> Active Invites</div>
            </div>
            <div className="section-card p-6 border-l-2 border-rose-400/50 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Trash2 size={64}/></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Archived</p>
               <h2 className="text-4xl font-display font-black text-white">{candidates.filter(c => c.status?.toLowerCase() === 'archived').length}</h2>
               <div className="flex items-center gap-1 mt-4 text-[10px] text-rose-400 font-bold"><Clock size={12}/> Inactive Pool</div>
            </div>
          </div>

          {/* Grid for Funnel and Recent Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col">
              {/* Pipeline Funnel */}
              <div className="section-card p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-6"><PieChart size={14}/> Talent Pipeline Status</h3>
                  <div className="flex gap-2 h-12 rounded-xl overflow-hidden shadow-inner">
                     {['New', 'Favourite', 'Invited', 'Hired', 'Rejected', 'Archived'].map(status => {
                       const count = candidates.filter(c => (c.status || 'New').toLowerCase() === status.toLowerCase()).length;
                       const percent = candidates.length > 0 ? (count / candidates.length) * 100 : 0;
                       if (count === 0) return null;
                       const colors = {
                          'new': 'bg-white/10',
                          'favourite': 'bg-primary/50',
                          'invited': 'bg-indigo/50',
                          'hired': 'bg-secondary/50',
                          'rejected': 'bg-error/50',
                          'archived': 'bg-rose-400/20'
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
                </div>
                <div className="flex flex-wrap items-center gap-6 mt-6">
                   {[
                     { label: 'New', color: 'bg-white/20' },
                     { label: 'Favourite', color: 'bg-primary/50' },
                     { label: 'Invited', color: 'bg-indigo/50' },
                     { label: 'Hired', color: 'bg-secondary/50' },
                     { label: 'Rejected', color: 'bg-error/50' },
                     { label: 'Archived', color: 'bg-rose-400/20' }
                   ].map(s => (
                      <div key={s.label} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                        <div className={`w-3 h-3 rounded-sm ${s.color}`} /> {s.label}
                      </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              {/* Recent Activity Feed */}
              <div className="section-card p-6 flex flex-col h-[400px]">
                <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-6">
                  <Activity size={14} className="text-primary" /> Recent Candidate Activity
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  {loadingActivities ? (
                    <div className="flex items-center justify-center h-full text-white/40 gap-2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Loading feed...</span>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-white/30 gap-2">
                      <Clock size={24} className="opacity-20" />
                      <p className="text-xs uppercase font-bold tracking-widest">No activities logged</p>
                    </div>
                  ) : (
                    activities.map((act) => {
                      const dateStr = act.created_at ? new Date(act.created_at).toLocaleString() : 'Just now';
                      
                      let Icon = Activity;
                      let iconColor = 'text-white/40 bg-white/5 border-white/10';
                      const action = act.action?.toLowerCase();
                      if (action?.includes('invite')) {
                        Icon = Mail;
                        iconColor = 'text-indigo bg-indigo/10 border-indigo/20';
                      } else if (action?.includes('create') || action?.includes('upload')) {
                        Icon = Plus;
                        iconColor = 'text-primary bg-primary/10 border-primary/20';
                      } else if (action?.includes('status') || action?.includes('shortlist') || action?.includes('archive')) {
                        Icon = Zap;
                        iconColor = 'text-secondary bg-secondary/10 border-secondary/20';
                      } else if (action?.includes('score') || action?.includes('rank')) {
                        Icon = Star;
                        iconColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
                      }
                      
                      return (
                        <div key={act.id} className="flex gap-4 p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors">
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${iconColor}`}>
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white leading-snug">
                              {act.candidate_name}
                            </p>
                            <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">
                              {act.detail || act.action}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{act.actor_name || 'System'}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10" />
                              <span className="text-[9px] text-white/30">{dateStr}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
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
                  <div className="flex w-full items-start justify-between mb-1">
                    <h3 className="text-lg font-bold text-white pr-2">{r.title}</h3>
                    <button onClick={() => openEditRole(r)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0">
                      <Edit size={14} />
                    </button>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/80 mt-1 mb-4">Min Exp: {r.min_experience} yrs</p>
                   <p className="text-xs text-white/40 leading-relaxed line-clamp-3 mb-4">{r.description || 'No description provided.'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : currentTab === 'upload' ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-6">
            <div className="section-card w-full max-w-xl p-10 relative">
              <h2 className="text-2xl font-display font-black text-white mb-8 uppercase tracking-widest flex items-center gap-2"><Upload size={24} className="text-primary"/> Inject Resume</h2>
              <div 
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all group flex flex-col items-center ${isDragging ? 'border-primary bg-primary/10' : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-primary/50'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input type="file" ref={fileRef} onChange={handleUpload} className="hidden" accept=".pdf,.doc,.docx,.txt,.zip" multiple />
                <input type="file" ref={folderRef} onChange={handleUpload} className="hidden" webkitdirectory="true" directory="true" />
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform cursor-pointer" onClick={() => !uploading && fileRef.current.click()}>
                  {uploading ? <Loader2 size={32} className="text-primary animate-spin" /> : <Upload size={32} className="text-primary" />}
                </div>
                <p className="text-white font-bold text-lg mb-2">{uploading ? 'Queueing Files...' : 'Select files or an entire folder'}</p>
                <p className="text-sm text-white/40">Supported formats: PDF, DOCX, TXT, ZIP</p>
                <div className="flex gap-4 mt-8">
                  <button disabled={uploading} onClick={() => !uploading && fileRef.current.click()} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-colors">Select Files</button>
                  <button disabled={uploading} onClick={() => !uploading && folderRef.current.click()} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-colors">Select Folder</button>
                </div>
              </div>
            </div>
            
            {bulkJobId && (
              <div className="section-card w-full max-w-xl p-6 border-primary/30 relative overflow-hidden">
                 <div className="absolute top-0 left-0 h-2 bg-primary/20 w-full">
                    {bulkJobProgress?.job?.total_files > 0 && (
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${((bulkJobProgress.items_stats?.filter(s => s.status !== 'pending' && s.status !== 'processing').reduce((a,b)=>a+b.count,0) || 0) / bulkJobProgress.job.total_files) * 100}%` }}
                      ></div>
                    )}
                 </div>
                 <div className="flex justify-between items-center mb-4 mt-2">
                   <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-primary" /> AI Processing Candidates
                   </h3>
                   {bulkJobProgress?.job?.total_files > 0 && (
                     <span className="text-xs font-bold text-primary">
                       {Math.round(((bulkJobProgress.items_stats?.filter(s => s.status !== 'pending' && s.status !== 'processing').reduce((a,b)=>a+b.count,0) || 0) / bulkJobProgress.job.total_files) * 100)}%
                     </span>
                   )}
                 </div>
                 <div className="flex flex-wrap gap-3">
                    {bulkJobProgress?.items_stats?.map(st => (
                       <div key={st.status} className="bg-white/5 px-4 py-2 rounded-lg text-xs border border-white/5 flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${st.status === 'success' ? 'bg-green-500' : st.status === 'failed' ? 'bg-red-500' : st.status === 'pending' ? 'bg-white/30' : 'bg-orange-500'}`}></div>
                          <span className="text-white/40 uppercase font-bold mr-2">{st.status}:</span>
                          <span className="text-white font-black">{st.count}</span>
                       </div>
                    ))}
                 </div>
                 <div className="flex justify-between items-center mt-6">
                   <p className="text-[10px] text-white/30 uppercase">Total Files Discovered: {bulkJobProgress?.job?.total_files || '...'}</p>
                   <div className="flex gap-4 items-center">
                     <p className="text-[10px] text-white/30 uppercase">Safe to leave this page, it runs in background</p>
                     <button onClick={handleCancelQueue} className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                       Cancel Queue
                     </button>
                   </div>
                 </div>
              </div>
            )}
        </div>
      ) : currentTab === 'offers' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <OfferApprovals />
        </div>
      ) : currentTab === 'active' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ActiveCandidates onViewProfile={(c) => setDrawerCandidate(c)} />
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
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Status</label>
            <select
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 transition-colors"
              value={filters.pool}
              onChange={e => setFilters(f => ({ ...f, pool: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="favourite">Favourite</option>
              <option value="invited">Invited</option>
              <option value="hired">Hired</option>
              <option value="archived">Archived</option>
              <option value="rejected">Rejected</option>
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

          {filters.role_id && (
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
          )}

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
          {filters.role_id && (
            <button
              onClick={() => handleAutoRank(filters.role_id)}
              disabled={autoRanking}
              className="px-6 py-2.5 ml-auto bg-indigo text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors duration-150 flex items-center gap-2"
            >
              {autoRanking ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              Auto Score All
            </button>
          )}
        </div>
      )}

      {/* ── Candidate Table ── */}
      <div className="section-card flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Table header */}
        <div className={`grid ${filters.role_id ? 'grid-cols-[40px_1fr_110px_100px_120px_110px_56px]' : 'grid-cols-[40px_1fr_100px_120px_110px_56px]'} gap-4 px-6 py-4 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 shrink-0`}>
          <div className="flex items-center justify-center">
            <button
              onClick={toggleAll}
              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${allSelected ? 'bg-primary border-primary text-black' : 'border-white/20 hover:border-primary/50'}`}
            >
              {allSelected && <CheckSquare size={12} />}
            </button>
          </div>
          <div>Candidate</div>
          {filters.role_id && <div className="text-center">AI Fit Score</div>}
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
          ) : filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <Search size={48} className="text-white/10" />
              <div>
                <p className="text-base font-bold text-white mb-1">No matches found</p>
                <p className="text-xs text-white/30">Try adjusting your search query</p>
              </div>
            </div>
          ) : (
            filteredCandidates.map(c => (
              <div
                key={c.id}
                onClick={() => setDrawerCandidate(c)}
                className={`grid ${filters.role_id ? 'grid-cols-[40px_1fr_110px_100px_120px_110px_56px]' : 'grid-cols-[40px_1fr_100px_120px_110px_56px]'} gap-4 px-6 py-4 items-center cursor-pointer transition-colors duration-150 group ${drawerCandidate?.id === c.id ? 'bg-primary/5' : 'hover:bg-white/[0.02]'}`}
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
                {filters.role_id && (
                  <div className="flex justify-center">
                    <span className={`px-3 py-1 rounded-lg border text-sm font-black ${SCORE_COLOR(c.fit_score)}`}>
                      {c.fit_score != null ? `${Math.round(c.fit_score)}%` : '—'}
                    </span>
                  </div>
                )}

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
          <button
            onClick={async () => {
              if(!confirm('Are you sure you want to delete these candidates?')) return;
              try {
                const r = await fetch('/api/source/candidates/bulk-delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ candidate_ids: Array.from(selectedIds) }),
                  credentials: 'include'
                });
                if(r.ok) {
                  toast.success('Candidates deleted successfully');
                  setSelectedIds(new Set());
                  fetchCandidates();
                } else {
                  toast.error('Failed to delete candidates');
                }
              } catch(e) {
                toast.error('Error deleting candidates');
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/30 transition-colors duration-150"
          >
            <Trash2 size={14} /> Delete
          </button>

          <button onClick={clearSel} className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors duration-150">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Candidate Profile Drawer ── */}
      <CandidateDrawer
        candidate={drawerCandidate}
        jobRoles={jobRoles}
        roleId={filters.role_id}
        onClose={() => setDrawerCandidate(null)}
        onRefresh={fetchCandidates}
      />

      {/* ── Upload Modal ── */}
      {showUpload && (
        <Modal onClose={() => setShowUpload(false)} title="Upload Resume">
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.zip" className="hidden" onChange={handleUpload} multiple />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-6 w-full border-2 border-dashed border-white/10 rounded-2xl p-16 hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150 cursor-pointer"
          >
            {uploading ? (
              <><Loader2 size={40} className="text-primary animate-spin" /><p className="text-sm font-bold text-white">AI parsing resume...</p></>
            ) : (
              <><Upload size={40} className="text-primary/60" /><div><p className="text-base font-bold text-white mb-1">Click to select file(s)</p><p className="text-xs text-white/30">PDF, DOC, DOCX, TXT, ZIP</p></div></>
            )}
          </button>
        </Modal>
      )}

      {/* ── New / Edit Role Modal ── */}
      {showNewRole && (
        <Modal onClose={() => setShowNewRole(false)} title={newRole.id ? "Edit Job Role" : "Create Job Role"}>
          <form onSubmit={handleSaveRole} className="flex flex-col gap-5">
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
              <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors">
                {newRole.id ? "Save Changes" : "Create Role"}
              </button>
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
            
            <Field label="Invitation Email Template">
              <select
                className="form-input"
                value={inviteForm.templateType}
                onChange={e => setInviteForm(f => ({ ...f, templateType: e.target.value }))}
              >
                <option value="prebuilt">Pre-built (Default Phygitron 360 Template)</option>
                <option value="custom">Custom Template</option>
              </select>
            </Field>

            {inviteForm.templateType === 'custom' && (
              <>
                <Field label="Email Subject">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Invitation to complete pre-employment assessment"
                    value={inviteForm.subject}
                    onChange={e => setInviteForm(f => ({ ...f, subject: e.target.value }))}
                  />
                </Field>
                <Field label="Email Body (Markdown supported)">
                  <textarea
                    rows={5}
                    className="form-input resize-none"
                    placeholder={`Dear {candidate_name},\n\nWe invite you to take the assessment for {role}.\nYour temporary password is: {temp_password}\nLink: {assessment_link}`}
                    value={inviteForm.custom_body}
                    onChange={e => setInviteForm(f => ({ ...f, custom_body: e.target.value }))}
                  />
                  <div className="text-[10px] text-white/40 leading-relaxed mt-1">
                    <strong>Guidelines:</strong> You can use these tokens:
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li><code className="text-primary">{`{candidate_name}`}</code> - Full name</li>
                      <li><code className="text-primary">{`{role}`}</code> - Job role title</li>
                      <li><code className="text-primary">{`{org_name}`}</code> - Organisation name</li>
                      <li><code className="text-primary">{`{assessment_link}`}</code> - URL to access the portal</li>
                      <li><code className="text-primary">{`{temp_password}`}</code> - Temporary password</li>
                    </ul>
                  </div>
                </Field>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
              <button type="submit" className="flex-1 py-3 rounded-xl bg-indigo text-white text-xs font-black uppercase tracking-widest hover:bg-indigo/80 transition-colors">Send Invites</button>
            </div>
          </form>
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
