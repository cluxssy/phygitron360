import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  UserPlus, Mail, CheckCircle, Clock, Trash2, Plus, 
  FileText, Briefcase, GraduationCap, MapPin, Phone, 
  ChevronRight, BadgeCheck, ShieldAlert, Eye, ExternalLink,
  Copy, Link
} from 'lucide-react';
import ComboBox from '../../../core/components/ComboBox';

const DESIGNATIONS = [
    'Software Engineer', 'Senior Engineer', 'Team Lead', 'Project Manager', 
    'Product Manager', 'Designer', 'QA Analyst', 'Sales Executive', 
    'HR Associate', 'Accountant', 'Marketing Specialist', 'Operations Manager'
];

const DEPARTMENTS = [
    'Engineering', 'Product', 'Design', 'Marketing', 'Sales', 
    'Human Resources', 'Finance', 'Operations', 'Quality Assurance'
];

export default function OnboardingPanel() {
  const [activeTab, setActiveTab] = useState('invites');
  const [invites, setInvites] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [managers, setManagers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dynDesignations, setDynDesignations] = useState([]);
  const [dynDepartments, setDynDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'employee', department: '', designation: '' });
  const [submitting, setSubmitting] = useState(false);

  // Approval Form Stats
  const [approveForm, setApproveForm] = useState({
    manager: '',
    type: 'Full Time',
    pf: 'No',
    mediclaim: 'No',
    location: '',
    notes: '',
    code: '',
    doj: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { 
    if (activeTab === 'invites') loadInvites();
    else {
        loadApprovals();
        loadOptions();
    }
  }, [activeTab]);

  const loadOptions = async () => {
    try {
        const res = await fetch('/api/options', { credentials: 'include' });
        const data = await res.json();
        setManagers(data.managers || []);
        setLocations(data.locations || []);
        if (data.designations?.length > 0) setDynDesignations(data.designations);
        if (data.teams?.length > 0) setDynDepartments(data.teams);
    } catch { console.warn('Failed to load portal options'); }
  };

  const loadInvites = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/invites', { credentials: 'include' });
      const data = await res.json();
      setInvites(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load invites'); }
    finally { setLoading(false); }
  };

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/approvals', { credentials: 'include' });
      const data = await res.json();
      setApprovals(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load pending approvals'); }
    finally { setLoading(false); }
  };

  const sendInvite = async () => {
    if (!form.email || !form.name) return toast.error('Name and email are required');
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/invite', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      toast.success(data.message || 'Onboarding invite created!');
      setShowForm(false);
      setForm({ name: '', email: '', role: 'employee', department: '', designation: '' });
      loadInvites();
    } catch (e) { toast.error(e.message || 'Failed to send invite'); }
    finally { setSubmitting(false); }
  };

  const deleteInvite = async (id) => {
    if (!window.confirm('Command: Confirm Revocation of Personnel Invitation?')) return;
    try {
      const res = await fetch(`/api/onboarding/invite/${id}`, { 
        method: 'DELETE', 
        credentials: 'include' 
      });
      if (res.ok) {
        toast.success('Invite sequence revoked');
        loadInvites();
      } else {
        throw new Error('Failed to revoke invite');
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const copyInviteLink = (token) => {
    const base = window.location.origin;
    const url = `${base}/onboard?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Neural link copied to clipboard!');
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('new_employee_code', approveForm.code);
      fd.append('doj', approveForm.doj);
      fd.append('reporting_manager', approveForm.manager);
      fd.append('employment_type', approveForm.type);
      fd.append('pf_included', approveForm.pf);
      fd.append('mediclaim_included', approveForm.mediclaim);
      fd.append('location', approveForm.location);
      fd.append('notes', approveForm.notes);

      const res = await fetch(`/api/onboarding/approve/${selectedApproval.employee_code}`, {
        method: 'POST', credentials: 'include',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Approval failed');
      
      toast.success('Employee Matrix Activated!');
      setSelectedApproval(null);
      loadApprovals();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inviteStatusStyle = {
    'Pending': 'bg-amber-500/10 text-amber-400',
    'Completed': 'bg-emerald-500/10 text-emerald-400',
    'Expired': 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">Neural Acquisition Node</p>
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">Onboarding Hub</h2>
        </div>
        
        <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('invites')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'invites' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
            >
               Outbound Invites
            </button>
            <button 
              onClick={() => setActiveTab('approvals')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'approvals' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
            >
               Pending Approvals
               {approvals.length > 0 && (
                 <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[8px] font-black text-white animate-pulse">
                   {approvals.length}
                 </span>
               )}
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Synchronizing Persistence Layer...</p>
        </div>
      ) : activeTab === 'invites' ? (
        <div className="space-y-6 animate-fade-in-up">
           {/* Invites Toolbar */}
           <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/5 shadow-2xl">
              <div className="flex gap-8 px-4">
                 {[
                   { label: 'Sent', val: invites.length, color: 'text-primary' },
                   { label: 'Pending', val: invites.filter(i => i.status === 'Pending').length, color: 'text-amber-400' },
                   { label: 'Completed', val: invites.filter(i => i.status === 'Completed').length, color: 'text-emerald-400' }
                 ].map((s, i) => (
                   <div key={i}>
                      <p className={`text-xl font-display font-black ${s.color}`}>{s.val}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{s.label}</p>
                   </div>
                 ))}
              </div>
              <button 
                onClick={() => setShowForm(true)}
                className="flex items-center gap-3 px-8 py-4 bg-primary text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus size={16} /> Deploy New Invite
              </button>
           </div>

           <div className="glass-panel border-white/5 overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-white/5 border-b border-white/10">
                 <tr>
                   {['Identity', 'Designation', 'Access Role', 'Current Status', 'Initiated', 'Action'].map(h => (
                     <th key={h} className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                   ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {invites.length === 0 ? (
                   <tr><td colSpan={6} className="px-6 py-20 text-center text-[10px] text-white/20 uppercase font-black tracking-widest">No active invite sequences in current sector</td></tr>
                 ) : invites.map((inv, i) => (
                   <tr key={inv.id || i} className="hover:bg-white/[0.02] transition-colors group">
                     <td className="px-6 py-4">
                        <p className="text-sm font-bold text-white">{inv.name}</p>
                        <p className="text-[10px] text-white/40 font-mono mt-1">{inv.email}</p>
                     </td>
                     <td className="px-6 py-4">
                        <p className="text-xs text-white/70 font-medium">{inv.designation || 'N/A'}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-widest">{inv.department || 'General'}</p>
                     </td>
                     <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{inv.role}</span>
                     </td>
                     <td className="px-6 py-4">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${inviteStatusStyle[inv.status] || 'bg-white/5 text-white/30'}`}>
                          {inv.status}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-[10px] text-white/20 font-mono">
                        {new Date(inv.created_at).toLocaleDateString()}
                     </td>
                      <td className="px-6 py-4 flex gap-2">
                        {inv.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => copyInviteLink(inv.token)} 
                              title="Copy Neural Link"
                              className="p-2 text-white/40 hover:text-primary transition-all bg-white/5 rounded-lg border border-white/5"
                            >
                               <Link size={14} />
                            </button>
                            <button 
                              onClick={() => deleteInvite(inv.id)} 
                              title="Revoke Invite"
                              className="p-2 text-white/40 hover:text-error transition-all bg-white/5 rounded-lg border border-white/5"
                            >
                               <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      ) : (
        /* Approvals Tab */
        <div className="space-y-6 animate-fade-in-up">
           <div className="glass-panel border-white/5 overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-white/5 border-b border-white/10">
                 <tr>
                   {['Candidate', 'Sector / Designation', 'Neural Code', 'Compliance', 'Action'].map(h => (
                     <th key={h} className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                   ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {approvals.length === 0 ? (
                   <tr><td colSpan={5} className="px-6 py-20 text-center text-[10px] text-white/20 uppercase font-black tracking-widest">Global personnel pipeline is clear</td></tr>
                 ) : approvals.map((app, i) => (
                   <tr key={app.employee_code || i} className="hover:bg-white/[0.02] transition-colors group">
                     <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-display font-black text-lg overflow-hidden shrink-0">
                              {app.photo_path ? (
                                  <img src={`/${app.photo_path}`} className="w-full h-full object-cover" alt="" />
                              ) : (
                                  app.name?.[0] || '?'
                              )}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-white">{app.name}</p>
                              <p className="text-[10px] text-white/40 font-mono mt-1">{app.email_id}</p>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-6">
                        <p className="text-xs text-white/70 font-medium">{app.designation}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-widest">{app.team}</p>
                     </td>
                     <td className="px-6 py-6">
                        <span className="text-[10px] font-black text-primary uppercase font-mono tracking-widest">{app.employee_code}</span>
                     </td>
                     <td className="px-6 py-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="flex items-center gap-2 text-[9px] font-black uppercase text-emerald-400/60"><BadgeCheck size={10} /> Identity Verified</span>
                            <span className="flex items-center gap-2 text-[9px] font-black uppercase text-amber-400/60"><Clock size={10} /> Awaiting Sync</span>
                        </div>
                     </td>
                     <td className="px-6 py-6 text-right">
                        <button 
                          onClick={() => {
                              setSelectedApproval(app);
                              setApproveForm(prev => ({ 
                                  ...prev, 
                                  code: app.employee_code, 
                                  location: app.location || '',
                                  doj: app.doj || new Date().toISOString().split('T')[0]
                              }));
                          }}
                          className="px-6 py-3 rounded-xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all group"
                        >
                          Review Matrix <ChevronRight size={14} className="inline ml-1 group-hover:translate-x-1 transition-transform" />
                        </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Invite Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="glass-panel border-white/10 rounded-3xl p-10 w-full max-w-md space-y-6 shadow-[0_50px_100px_rgba(0,0,0,0.9)] scale-in-center">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><UserPlus size={24} /></div>
              <h3 className="text-lg font-black uppercase tracking-tighter text-white">Outbound Sequence</h3>
            </div>
            
            <div className="space-y-4">
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Name</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full glass-panel border-white/5 text-white text-xs bg-black/20 px-5 py-4 rounded-xl focus:border-primary/40 outline-none" placeholder="Full name..." />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Email</label>
                  <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full glass-panel border-white/5 text-white text-xs bg-black/20 px-5 py-4 rounded-xl focus:border-primary/40 outline-none" placeholder="Email address..." />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex-1">
                    <ComboBox 
                      label="Designation"
                      options={dynDesignations.length > 0 ? dynDesignations : DESIGNATIONS}
                      value={form.designation}
                      onChange={val => setForm({...form, designation: val})}
                      placeholder="Select Designation..."
                    />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <ComboBox 
                      label="Department"
                      options={dynDepartments.length > 0 ? dynDepartments : DEPARTMENTS}
                      value={form.department}
                      onChange={val => setForm({...form, department: val})}
                      placeholder="Select Department..."
                    />
                  </div>
               </div>
              <div className="space-y-1.5">
                 <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Access Role</label>
                  <select 
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}
                    className="w-full glass-panel border-white/5 text-white text-xs bg-black/20 px-5 py-4 rounded-xl focus:border-primary/40 outline-none"
                  >
                    {[
                      { id: 'org_admin', label: 'Org Admin (L2)' },
                      { id: 'manager', label: 'Manager (L3)' },
                      { id: 'employee', label: 'Employee (L4)' }
                    ].map(r => (
                      <option key={r.id} value={r.id} className="bg-[#080f1f]">{r.label}</option>
                    ))}
                  </select>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button 
                onClick={() => setShowForm(false)}
                className="flex-1 py-4 rounded-2xl border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
              >
                Abort
              </button>
              <button 
                onClick={sendInvite} disabled={submitting}
                className="flex-1 py-4 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {submitting ? 'Transmitting...' : 'Initiate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval & Review Drawer (The "Detail View") */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/90 backdrop-blur-md">
           <div className="w-full max-w-3xl h-full glass-panel border-l border-white/10 animate-slide-in-right overflow-y-auto pr-2 custom-scrollbar">
              <div className="p-10 space-y-10">
                 {/* Header */}
                 <div className="flex justify-between items-start">
                    <div className="flex gap-6 items-center">
                        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-display font-black text-3xl overflow-hidden shrink-0">
                           {selectedApproval.photo_path ? (
                               <img src={`/${selectedApproval.photo_path}`} className="w-full h-full object-cover" alt="" />
                           ) : (
                               selectedApproval.name?.[0]
                           )}
                        </div>
                        <div>
                           <div className="flex items-center gap-3">
                              <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">{selectedApproval.name}</h2>
                              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Awaiting Neural Link</span>
                           </div>
                           <p className="text-primary font-black text-xs uppercase tracking-[0.3em] mt-2 italic">{selectedApproval.designation} // {selectedApproval.team}</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedApproval(null)} className="p-3 bg-white/5 rounded-2xl text-white/30 hover:text-error transition-all hover:bg-error/10">Abort Review</button>
                 </div>

                 {/* Information Grid - HERE IS THE DATA VISIBILITY FIX */}
                 <div className="grid grid-cols-2 gap-8">
                    {/* Basic Section */}
                    <div className="space-y-6">
                        <SectionHeader icon={FileText} label="Personal Vectors" />
                        <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                            <InfoCard label="Email Access" value={selectedApproval.email_id} icon={Mail} />
                            <InfoCard label="Contact Frequency" value={selectedApproval.contact_number} icon={Phone} />
                            <InfoCard label="Temporal Origin" value={selectedApproval.dob} icon={Clock} />
                            <InfoCard label="Emergency Contact" value={selectedApproval.emergency_contact} icon={ShieldAlert} />
                        </div>

                        <SectionHeader icon={Briefcase} label="Neural Capabilities" />
                        <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary">Primary Skill Assets</p>
                                <p className="text-xs text-white/80 leading-relaxed font-medium">{selectedApproval.primary_skillset || 'No telemetry detected'}</p>
                            </div>
                            <div className="space-y-1 mt-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Secondary Capabilities</p>
                                <p className="text-xs text-white/50 leading-relaxed">{selectedApproval.secondary_skillset || 'None'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Geography & Education */}
                    <div className="space-y-6">
                        <SectionHeader icon={MapPin} label="Geographic Anchors" />
                        <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Current Base</p>
                                <p className="text-xs text-white/70 leading-relaxed">{selectedApproval.current_address}</p>
                            </div>
                            <div className="space-y-1 mt-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Permanent Point</p>
                                <p className="text-xs text-white/70 leading-relaxed">{selectedApproval.permanent_address}</p>
                            </div>
                        </div>

                        <SectionHeader icon={GraduationCap} label="Academic History Blocks" />
                        <div className="space-y-3 bg-white/5 p-6 rounded-3xl border border-white/5">
                            {(() => {
                                let edu = selectedApproval.education_details;
                                try {
                                    if (typeof edu === 'string') edu = JSON.parse(edu);
                                } catch { 
                                    return <p className="text-xs text-white/50 italic">Invalid data format.</p>;
                                }
                                
                                if (Array.isArray(edu) && edu.length > 0) {
                                    return edu.map((e, idx) => (
                                        <div key={idx} className="pb-3 mb-3 border-b border-white/5 last:border-0 last:pb-0 last:mb-0">
                                            <p className="text-xs font-black text-white uppercase">{e.degree}</p>
                                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest italic">{e.university} ({e.year})</p>
                                            {e.percentage && <p className="text-[10px] text-primary mt-1 font-black">Scoring: {e.percentage}</p>}
                                        </div>
                                    ));
                                }
                                return <p className="text-xs text-white/50 italic">No academic history detected.</p>;
                            })()}
                        </div>
                    </div>
                 </div>

                 {/* Document Review */}
                 <div className="space-y-6">
                    <SectionHeader icon={Eye} label="Identity Artifacts" />
                    <div className="grid grid-cols-3 gap-4">
                        {[
                           { label: 'Neural Resume (CV)', path: selectedApproval.cv_path },
                           { label: 'Identity Visual', path: selectedApproval.photo_path },
                           { label: 'Official Credential', path: selectedApproval.id_proofs }
                        ].map((d, i) => (
                           <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                              <div className="flex items-center gap-3">
                                 <FileText size={16} className="text-primary" />
                                 <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{d.label}</p>
                              </div>
                               {d.path ? (
                                 <a href={`/${d.path}`} target="_blank" rel="noreferrer" className="text-primary hover:text-white transition-colors bg-white/5 p-2 rounded-lg"><ExternalLink size={14}/></a>
                               ) : (
                                 <span className="text-error/30 text-[8px] font-black uppercase">Missing</span>
                               )}
                           </div>
                        ))}
                    </div>
                 </div>

                 {/* Approval Form */}
                 <div className="mt-12 p-10 bg-emerald-500/5 border border-emerald-500/10 rounded-[40px] space-y-8 shadow-2xl shadow-emerald-500/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-emerald-500/40 shadow-inner">
                           <ShieldAlert size={24} />
                        </div>
                        <div>
                           <h3 className="text-xl font-display font-black text-white uppercase tracking-tighter">Initiate Activation Protocol</h3>
                           <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Assign parameters to finalize personnel matrix</p>
                        </div>
                    </div>

                    <form onSubmit={handleApprove} className="space-y-6">
                       <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <ComboBox 
                                label="Reporting Manager"
                                options={managers.map(m => ({ id: m.code, name: `${m.name} (${m.role})` }))}
                                value={approveForm.manager}
                                onChange={val => setApproveForm({...approveForm, manager: val})}
                                placeholder="Select or type manager name..."
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Neural Employment Type</label>
                              <select 
                                value={approveForm.type}
                                onChange={e => setApproveForm({...approveForm, type: e.target.value})}
                                className="w-full glass-panel border-white/10 bg-black/40 px-5 py-4 rounded-2xl text-xs text-white focus:border-emerald-500/40 outline-none"
                              >
                                 <option value="Full Time" className="bg-[#080f1f]">Full Time</option>
                                 <option value="Contract" className="bg-[#080f1f]">Contract</option>
                                 <option value="Internship" className="bg-[#080f1f]">Internship</option>
                              </select>
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-3 gap-6">
                           {['pf', 'mediclaim'].map(k => (
                             <div key={k} className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">{k.toUpperCase()} Enrollment</label>
                                <select 
                                  value={approveForm[k]}
                                  onChange={e => setApproveForm({...approveForm, [k]: e.target.value})}
                                  className="w-full glass-panel border-white/10 bg-black/40 px-5 py-4 rounded-2xl text-xs text-white focus:border-emerald-500/40 outline-none"
                                >
                                   <option value="No" className="bg-[#080f1f]">No</option>
                                   <option value="Yes" className="bg-[#080f1f]">Yes</option>
                                </select>
                             </div>
                           ))}
                           <div className="space-y-2">
                              <ComboBox 
                                label="Location of Work"
                                options={locations.length > 0 ? locations : ['Remote', 'On-Site', 'Hybrid']}
                                value={approveForm.location}
                                onChange={val => setApproveForm({...approveForm, location: val})}
                                placeholder="Choose location..."
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Onboarding / Employee Code (Editable)</label>
                              <input 
                                value={approveForm.code}
                                onChange={e => setApproveForm({...approveForm, code: e.target.value})}
                                className="w-full glass-panel border-white/10 bg-black/40 px-5 py-4 rounded-2xl text-xs text-primary font-black uppercase font-mono outline-none focus:border-primary/40"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Official Date of Joining (DOJ)</label>
                              <input 
                                type="date"
                                value={approveForm.doj}
                                onChange={e => setApproveForm({...approveForm, doj: e.target.value})}
                                className="w-full glass-panel border-white/10 bg-black/40 px-5 py-4 rounded-2xl text-xs text-white outline-none focus:border-emerald-500/40"
                              />
                           </div>
                       </div>

                       <div className="space-y-2">
                           <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Internal Clearance Notes</label>
                           <textarea 
                             rows="3"
                             value={approveForm.notes}
                             onChange={e => setApproveForm({...approveForm, notes: e.target.value})}
                             placeholder="Neural profile performance notes..."
                             className="w-full glass-panel border-white/10 bg-black/40 px-5 py-4 rounded-2xl text-xs text-white focus:border-emerald-500/40 outline-none resize-none"
                           />
                       </div>

                       <div className="flex gap-4 pt-4">
                          <button 
                            type="button"
                            onClick={() => setSelectedApproval(null)}
                            className="flex-1 py-5 rounded-3xl border border-white/10 text-white/30 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
                          >
                            Defer Approval
                          </button>
                          <button 
                            type="submit" disabled={submitting}
                            className="flex-1 py-5 rounded-3xl bg-emerald-500 text-black font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            {submitting ? 'Activating Matrix...' : 'Activate Personnel'}
                          </button>
                       </div>
                    </form>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, label }) {
    return (
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
            <Icon size={16} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">{label}</span>
        </div>
    );
}

function InfoCard({ label, value, icon: Icon }) {
    return (
        <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/20 shrink-0"><Icon size={12}/></div>
            <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-0.5">{label}</p>
                <p className="text-xs text-white/90 font-medium">{value || '—'}</p>
            </div>
        </div>
    );
}
