import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Shield, Users, Activity, Plus, Trash2, Link } from 'lucide-react';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [rolesPerms, setRolesPerms] = useState({});
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
      } else if (activeTab === 'logs') {
        const res = await fetch('/api/admin/logs', { credentials: 'include' });
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch { toast.error('Failed to load data'); }
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
         throw new Error(data.detail || 'Creation failed');
      }
      toast.success('User created!');
      setShowAddForm(false);
      setForm({ username: '', password: '', role: 'employee', employee_code: '' });
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Deletion failed');
      toast.success('User deleted');
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
      if (!res.ok) throw new Error('Toggle failed');
      toast.success(currentStatus ? 'User locked' : 'User unlocked');
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
      if (!res.ok) throw new Error('Update failed');
      toast.success('Role updated');
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
      if (!res.ok) throw new Error('Update failed');
      toast.success('Linked employee updated');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const updateRolePerms = async (role, perms) => {
      try {
        const res = await fetch('/api/admin/permissions/roles', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, permissions: perms })
        });
        if (!res.ok) throw new Error();
        toast.success('Permissions updated');
      } catch (e) { toast.error('Update failed'); }
  };

  const togglePermission = (role, permKey) => {
      const newPerms = { ...rolesPerms };
      if (!newPerms[role]) return;
      newPerms[role][permKey] = !newPerms[role][permKey];
      setRolesPerms(newPerms);
      
      const updatedList = Object.keys(newPerms[role]).filter(k => newPerms[role][k]);
      updateRolePerms(role, updatedList);
  };

  const PERMISSIONS_LIST = [
      'manage_employees', 'manage_attendance', 'manage_assessments', 'manage_training', 
      'manage_assets', 'manage_onboarding', 'manage_system', 'view_reports', 'manage_ops'
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Head navigation */}
      <div className="glass-panel p-4 border-white/5 flex gap-4">
        {[
          { id: 'users', label: 'Users', icon: Users },
          { id: 'permissions', label: 'Role Permissions', icon: Shield },
          { id: 'logs', label: 'Audit Logs', icon: Activity },
        ].map(t => (
          <button
            key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === t.id ? 'bg-primary text-black' : 'glass-panel border-white/5 text-white/40 hover:text-white'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center h-32 items-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Users Tab */}
      {!loading && activeTab === 'users' && (
        <div className="space-y-4 animate-fade-in-up">
           <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/5">
               <h3 className="text-[12px] font-black uppercase tracking-widest text-white px-4">System Users</h3>
               <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-6 py-2 bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all rounded-xl">
                 <Plus size={14} /> Add User
               </button>
           </div>
           
           <div className="glass-panel border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">ID / Username</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">Role</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">Employee Code</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                        <p className="text-xs font-bold text-white">{u.username}</p>
                        <p className="text-[9px] text-white/40 uppercase">ID: {u.id}</p>
                    </td>
                    <td className="px-6 py-4">
                       <select 
                         value={u.role} 
                         onChange={e => updateRole(u.id, e.target.value)}
                         className="glass-panel border-white/10 text-white text-xs bg-transparent px-3 py-1.5 rounded-lg focus:outline-none"
                       >
                         {['super_admin', 'org_admin', 'manager', 'employee', 'candidate'].map(r => (
                             <option key={r} value={r} className="bg-[#080f1f]">{r}</option>
                         ))}
                       </select>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Link size={14} className="text-white/30" />
                           <input 
                             type="text" 
                             defaultValue={u.employee_code || ''}
                             onBlur={e => updateEmployeeCode(u.id, e.target.value)}
                             placeholder="Link code..."
                             className="w-24 glass-panel border-white/10 text-white text-xs bg-transparent px-2 py-1.5 rounded-lg focus:outline-none"
                           />
                        </div>
                    </td>
                    <td className="px-6 py-4">
                       <button onClick={() => toggleActive(u.id, u.is_active !== 0)} className={`p-2 rounded-xl transition-colors mr-2 ${u.is_active !== 0 ? 'text-white/40 hover:bg-white/10' : 'text-error hover:bg-error/10'}`} title="Lock/Unlock">
                         <Shield size={16} />
                       </button>
                       <button onClick={() => deleteUser(u.id)} className="p-2 text-error hover:bg-error/10 rounded-xl transition-colors">
                          <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
        </div>
      )}

      {/* Permissions Tab */}
      {!loading && activeTab === 'permissions' && (
        <div className="glass-panel border-white/5 overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Role Permission Matrix</h3>
                <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Configure access levels across the platform</p>
            </div>
            <div className="overflow-x-auto p-4">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr>
                     <th className="p-3 text-[9px] font-black uppercase tracking-widest text-white/40 border-b border-white/5">Permission</th>
                     {Object.keys(rolesPerms).map(r => (
                        <th key={r} className="p-3 text-[9px] font-black uppercase tracking-widest text-primary border-b border-white/5 text-center">{r}</th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                   {PERMISSIONS_LIST.map(p => (
                     <tr key={p} className="hover:bg-white/[0.02]">
                       <td className="p-3 text-xs text-white/70 font-mono border-b border-white/5">{p}</td>
                       {Object.keys(rolesPerms).map(r => (
                         <td key={`${r}-${p}`} className="p-3 border-b border-white/5 text-center">
                           <input 
                              type="checkbox" 
                              checked={!!rolesPerms[r][p]} 
                              onChange={() => togglePermission(r, p)}
                              className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                           />
                         </td>
                       ))}
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
        </div>
      )}

      {/* Logs Tab */}
      {!loading && activeTab === 'logs' && (
        <div className="glass-panel border-white/5 overflow-hidden animate-fade-in-up">
           <table className="w-full text-left">
              <thead className="border-b border-white/5 bg-white/5">
                <tr>
                  {['Timestamp', 'Actor', 'Action', 'Details'].map(h => (
                    <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-[10px] text-white/40 font-mono uppercase">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs font-bold text-white">{l.actor}</td>
                    <td className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-primary">{l.action}</td>
                    <td className="px-6 py-4 text-xs text-white/60">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel border-white/10 rounded-3xl p-8 w-full max-w-md mx-4 space-y-5 animate-fade-in-up">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Create New User</h3>
            <input placeholder="Username / Email" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
              className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none" />
            <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none" />
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
              className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none">
               {['super_admin', 'org_admin', 'manager', 'employee', 'candidate'].map(r => <option key={r} value={r} className="bg-[#080f1f]">{r}</option>)}
            </select>
            <input placeholder="Employee Code (Optional)" value={form.employee_code} onChange={e => setForm({...form, employee_code: e.target.value})}
              className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none" />
            
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddForm(false)} className="flex-1 py-3 rounded-2xl glass-panel border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
                Cancel
              </button>
              <button onClick={createUser} className="flex-1 py-3 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all">
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
