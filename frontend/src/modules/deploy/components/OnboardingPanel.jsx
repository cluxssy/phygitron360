import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus, Mail, CheckCircle, Clock, Trash2, Plus } from 'lucide-react';

export default function OnboardingPanel() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'employee', department: '', designation: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadInvites(); }, []);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/invites', { credentials: 'include' });
      const data = await res.json();
      setInvites(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load invites'); }
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
      toast.success('Onboarding invite sent!');
      setShowForm(false);
      setForm({ name: '', email: '', role: 'employee', department: '', designation: '' });
      loadInvites();
    } catch (e) { toast.error(e.message || 'Failed to send invite'); }
    finally { setSubmitting(false); }
  };

  const revokeInvite = async (id) => {
    try {
      await fetch(`/api/onboarding/invite/${id}`, { method: 'DELETE', credentials: 'include' });
      toast.success('Invite revoked');
      loadInvites();
    } catch { toast.error('Revoke failed'); }
  };

  const statusStyle = {
    'Pending': 'bg-amber-500/10 text-amber-400',
    'Completed': 'bg-emerald-500/10 text-emerald-400',
    'Expired': 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Neural Onboarding Engine</p>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Invite Management</h3>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-3 px-6 py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={14} /> Send Invite
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sent', value: invites.length, color: '#CC97FF' },
          { label: 'Pending', value: invites.filter(i => i.status === 'Pending').length, color: '#F59E0B' },
          { label: 'Completed', value: invites.filter(i => i.status === 'Completed').length, color: '#10B981' },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-6 border-white/5 text-center">
            <p className="text-3xl font-display font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Invites Table */}
      <div className="glass-panel border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Name', 'Email', 'Role', 'Department', 'Status', 'Sent', 'Actions'].map(h => (
                <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : invites.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-[10px] text-white/20 uppercase font-black">
                No onboarding invitations sent yet
              </td></tr>
            ) : invites.map((inv, i) => (
              <tr key={inv.id || i} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4 text-xs font-bold text-white">{inv.name}</td>
                <td className="px-6 py-4 text-xs text-white/50 flex items-center gap-2 mt-3">
                  <Mail size={11}/> {inv.email}
                </td>
                <td className="px-6 py-4 text-xs text-primary font-bold uppercase">{inv.role}</td>
                <td className="px-6 py-4 text-xs text-white/40">{inv.department || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${statusStyle[inv.status] || 'bg-white/5 text-white/30'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[10px] text-white/30">
                  {new Date(inv.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {inv.status === 'Pending' && (
                    <button onClick={() => revokeInvite(inv.id)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Send Invite Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel border-white/10 rounded-3xl p-8 w-full max-w-md mx-4 space-y-5">
            <div className="flex items-center gap-4 mb-2">
              <UserPlus size={20} className="text-primary" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Send Onboarding Invite</h3>
            </div>
            {[
              { key: 'name', placeholder: 'Full Name', type: 'text' },
              { key: 'email', placeholder: 'Work Email', type: 'email' },
              { key: 'designation', placeholder: 'Designation', type: 'text' },
              { key: 'department', placeholder: 'Department / Team', type: 'text' },
            ].map(f => (
              <input
                key={f.key}
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none placeholder-white/20"
              />
            ))}
            <select
              value={form.role}
              onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
              className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none"
            >
              {['employee', 'hr_manager', 'team_lead', 'recruiter'].map(r => (
                <option key={r} value={r} className="bg-[#080f1f]">{r}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-2xl glass-panel border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
                Cancel
              </button>
              <button onClick={sendInvite} disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all disabled:opacity-50">
                {submitting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
