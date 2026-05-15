import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Shield, Users, Activity, Plus, Trash2, Link, Lock, Key } from 'lucide-react';
import ClearanceMatrix from './ClearanceMatrix';
import UserClearanceOverrides from './UserClearanceOverrides';
import ModuleControl from './ModuleControl';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [rolesPerms, setRolesPerms] = useState({});
  const [tenantOps, setTenantOps] = useState({ modules_enabled: [] });
  const [userOverrides, setUserOverrides] = useState({});
  const [selectedUserForOverride, setSelectedUserForOverride] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'employee', employee_code: '' });

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { credentials: 'include' });
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else if (activeTab === 'permissions') {
        const res = await fetch('/api/admin/permissions/roles', { credentials: 'include' });
        const data = await res.json();
        setRolesPerms(data || {});
      } else if (activeTab === 'modules') {
        const res = await fetch('/api/org/billing-status', { credentials: 'include' });
        const data = await res.json();
        setTenantOps({ modules_enabled: data.modules || [] });
      } else if (activeTab === 'logs') {
        const res = await fetch('/api/admin/logs', { credentials: 'include' });
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch { toast.error('Neural Link Error'); }
    finally { setLoading(false); }
  };

  const createUser = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.detail || 'Identity Creation failed');
      }
      toast.success('Identity Provisioned');
      setShowAddForm(false);
      setForm({ username: '', password: '', role: 'employee', employee_code: '' });
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Decommission this identity permanentely?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Decommissioning failed');
      toast.success('Identity Purged');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (!res.ok) throw new Error('Lock sequence failed');
      toast.success(currentStatus ? 'Node Locked' : 'Node Restored');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const updateRole = async (id, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Identity update failed');
      toast.success('Clearance Level Updated');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const updateEmployeeCode = async (id, code) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/employee-code`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_code: code || null })
      });
      if (!res.ok) throw new Error('Mapping failed');
      toast.success('Personnel Link Synchronized');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const loadUserOverrides = async (id) => {
    try {
      const res = await fetch(`/api/admin/permissions/users/${id}`, { credentials: 'include' });
      const data = await res.json();
      setUserOverrides(data || {});
    } catch { toast.error('Failed to resolve clearances'); }
  };

  const updateOverride = async (userId, perm, value) => {
    try {
      const res = await fetch(`/api/admin/permissions/users/${userId}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: { [perm]: value } })
      });
      if (!res.ok) throw new Error();
      toast.success('Neural Clearance Adjusted');
      loadUserOverrides(userId);
    } catch { toast.error('Override Error'); }
  };

  const TABS = [
    { id: 'users', label: 'Identity Matrix', icon: Users },
    { id: 'permissions', label: 'Clearance Matrix', icon: Shield },
    { id: 'modules', label: 'Ecosystem Hub', icon: Activity },
    { id: 'logs', label: 'Audit Stream', icon: Activity },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-24 px-4 sm:px-6 animate-fade-in">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)]" />
              <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary italic">Neural Command Center</p>
           </div>
           <h1 className="text-5xl font-display font-black text-white uppercase tracking-tighter leading-none">
              Workspace <span className="text-primary italic">Administration</span>
           </h1>
           <p className="text-xs text-white/30 mt-4 uppercase tracking-widest font-medium">Platform Governance & Security Layer Protocols</p>
        </div>
        
        <div className="flex gap-2 p-1.5 glass-panel border-white/5 bg-white/[0.02] rounded-2xl">
          {TABS.map(t => (
            <button
              key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden group ${
                activeTab === t.id ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {activeTab === t.id && (
                  <span className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50" />
              )}
              <t.icon size={13} strokeWidth={3} className={activeTab === t.id ? 'animate-pulse' : ''} /> 
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/5 w-full" />

      {loading ? (
        <div className="flex flex-col justify-center h-64 items-center gap-4">
             <div className="relative">
                <div className="w-12 h-12 border-2 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
             </div>
             <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] animate-pulse">Syncing Neural Nodes...</p>
        </div>
      ) : (
        <div className="animate-fade-in-up">
          {activeTab === 'users' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                   <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-2xl glass-panel border-white/10 flex items-center justify-center bg-primary/10 text-primary">
                            <Users size={24} />
                       </div>
                       <div>
                           <h3 className="text-xl font-bold text-white uppercase tracking-tight">Active Identity Index</h3>
                           <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">Total provisioning for this workspace environment</p>
                       </div>
                   </div>
                   <button onClick={() => setShowAddForm(true)} className="group flex items-center gap-3 px-8 py-4 bg-primary text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all rounded-2xl shadow-xl shadow-primary/10 active:scale-95">
                     <Plus size={16} strokeWidth={3} /> Provision New Identity
                   </button>
               </div>
               
               <div className="glass-panel border-white/5 overflow-hidden rounded-[2.5rem] bg-white/[0.01]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">Identity Context</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">Clearance Level</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">Personnel link</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5 text-right">Node Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-white/[0.03] group transition-all duration-300">
                        <td className="px-10 py-8">
                            <div className="flex items-center gap-5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase tracking-tighter shadow-inner ${u.is_active !== 0 ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-red-500/10 text-red-500 border border-red-500/10'}`}>
                                    {u.username.substring(0,2)}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white group-hover:text-primary transition-colors">{u.username}</p>
                                    <p className="text-[9px] text-white/20 font-mono mt-1 tracking-widest uppercase">ID: NODE_{u.id.toString().padStart(4, '0')}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-10 py-8">
                           <select 
                             value={u.role} 
                             onChange={e => updateRole(u.id, e.target.value)}
                             className="glass-panel border-white/5 text-primary text-[10px] font-black uppercase tracking-[0.1em] bg-black/40 px-4 py-2.5 rounded-xl focus:outline-none hover:border-primary/20 transition-all cursor-pointer"
                           >
                             {['super_admin', 'org_admin', 'manager', 'employee', 'candidate'].map(r => (
                                 <option key={r} value={r} className="bg-[#080f1f]">{r.replace('_', ' ')}</option>
                             ))}
                           </select>
                        </td>
                        <td className="px-10 py-8">
                            <div className="flex items-center gap-3 glass-panel border-white/5 bg-black/20 px-4 py-2 rounded-xl group-hover:border-white/10 transition-colors">
                               <Link size={12} className="text-white/20" />
                               <input 
                                 type="text" 
                                 defaultValue={u.employee_code || ''}
                                 onBlur={e => updateEmployeeCode(u.id, e.target.value)}
                                 placeholder="Link Neural Code"
                                 className="w-28 bg-transparent text-[10px] text-white/60 font-mono focus:outline-none placeholder:text-white/10"
                               />
                            </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => {
                                 setSelectedUserForOverride(u);
                                 loadUserOverrides(u.id);
                               }}
                               className="w-10 h-10 flex items-center justify-center text-primary/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all border border-transparent hover:border-primary/20 active:scale-95" 
                               title="Adjust Neural Clearance"
                             >
                               <Key size={16} strokeWidth={2.5} />
                             </button>
                             <button onClick={() => toggleActive(u.id, u.is_active !== 0)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border border-transparent active:scale-95 ${u.is_active !== 0 ? 'text-white/20 hover:text-white hover:bg-white/5 hover:border-white/10' : 'text-red-500 hover:bg-red-500/10 hover:border-red-500/20'}`} title="Lock/Restore Node">
                               <Lock size={16} strokeWidth={2.5} />
                             </button>
                             <button onClick={() => deleteUser(u.id)} className="w-10 h-10 flex items-center justify-center text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 active:scale-95" title="Purge Identity">
                                <Trash2 size={16} strokeWidth={2.5} />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <ClearanceMatrix 
                rolesPerms={rolesPerms} 
                onUpdate={(role, newList) => setRolesPerms(prev => ({ ...prev, [role]: newList }))} 
            />
          )}

          {activeTab === 'modules' && (
            <ModuleControl 
                tenantOps={tenantOps} 
                onUpdate={setTenantOps} 
            />
          )}

          {activeTab === 'logs' && (
            <div className="glass-panel border-white/5 overflow-hidden rounded-[2.5rem] bg-white/[0.01]">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      {['Timeline', 'Clearance Subject', 'Operational Vector', 'Telemetry Details'].map(h => (
                        <th key={h} className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-10 py-6 text-[10px] text-white/40 font-mono uppercase tracking-tighter">
                            {new Date(l.timestamp).toLocaleDateString()}
                            <span className="block text-[9px] text-white/20 mt-1">{new Date(l.timestamp).toLocaleTimeString()}</span>
                        </td>
                        <td className="px-10 py-6">
                            <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-white uppercase">{l.actor}</span>
                        </td>
                        <td className="px-10 py-6">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">{l.action.replace('_', ' ')}</span>
                        </td>
                        <td className="px-10 py-6 text-[11px] text-white/60 leading-relaxed max-w-md">{l.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-panel border-white/10 rounded-[2.5rem] p-12 w-full max-w-md space-y-8 animate-fade-in-up bg-[#080808] shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full" />
            
            <div className="relative z-10">
                <h3 className="text-3xl font-display font-black uppercase tracking-tighter text-white">Identity Provisioning</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-black mt-2">Initialize new workspace node</p>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">Access Protocol (Username)</label>
                    <input placeholder="NEURAL_ID / EMAIL" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                      className="w-full glass-panel border-white/5 text-white text-sm bg-white/[0.02] px-6 py-4 rounded-2xl focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/5" />
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">Clearance Key (Password)</label>
                    <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                      className="w-full glass-panel border-white/5 text-white text-sm bg-white/[0.02] px-6 py-4 rounded-2xl focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/5" />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">Default Clearance Domain</label>
                    <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                      className="w-full glass-panel border-white/5 text-primary text-[10px] font-black uppercase tracking-widest bg-white/[0.02] px-6 py-4 rounded-2xl focus:outline-none cursor-pointer">
                       {['super_admin', 'org_admin', 'manager', 'employee', 'candidate'].map(r => <option key={r} value={r} className="bg-[#080f1f]">{r.replace('_', ' ')}</option>)}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">Personnel Mapping ID</label>
                    <input placeholder="LINKAGE_CODE_ALPHA" value={form.employee_code} onChange={e => setForm({...form, employee_code: e.target.value})}
                      className="w-full glass-panel border-white/5 text-white text-sm bg-white/[0.02] px-6 py-4 rounded-2xl focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/5" />
                </div>
            </div>
            
            <div className="flex gap-4 mt-12 relative z-10">
              <button 
                onClick={() => setShowAddForm(false)} 
                className="flex-1 py-4 rounded-2xl glass-panel border-white/10 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white hover:bg-white/5 transition-all active:scale-95"
              >
                Abort
              </button>
              <button 
                onClick={createUser} 
                className="flex-1 py-4 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white transition-all shadow-xl shadow-primary/20 active:scale-95"
              >
                Confirm Node
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Overrides Modal (Modularized) */}
      {selectedUserForOverride && (
          <UserClearanceOverrides 
            user={selectedUserForOverride}
            overrides={userOverrides}
            onUpdate={updateOverride}
            onClose={() => setSelectedUserForOverride(null)}
          />
      )}
    </div>
  );
}
