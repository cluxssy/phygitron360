import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { User, MapPin, Phone, Mail, Calendar, Briefcase, Clock, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/employee-stats', { credentials: 'include' });
        const data = await res.json();
        setProfile(data);
      } catch { toast.error('Failed to load profile'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const emp = profile?.employee || {};
  const kras = profile?.kras || {};
  const training = profile?.training || {};
  const attendance = profile?.attendance || {};
  const leaves = profile?.leaves || {};

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Hero */}
      <div className="glass-panel p-10 border-white/5 flex flex-col md:flex-row items-start gap-8">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display font-black text-4xl shrink-0">
          {(emp.name || user?.name || 'U')[0]}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">
            {user?.employee_code} // {user?.role}
          </p>
          <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter">
            {emp.name || user?.name}
          </h1>
          <p className="text-sm text-white/50 font-bold mt-2">{emp.designation} · {emp.team}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 text-xs text-white/40">
            <span className="flex items-center gap-2"><MapPin size={12}/> {emp.location || '—'}</span>
            <span className="flex items-center gap-2"><Calendar size={12}/> Joined {emp.doj || '—'}</span>
            <span className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${attendance.status === 'Present' ? 'bg-emerald-500' : 'bg-white/20'}`} />
              {attendance.status || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'KRAs Assigned', value: kras.total || 0, sub: `${kras.completed || 0} Completed`, color: '#CC97FF' },
          { label: 'Training Done', value: `${training.completed || 0}/${training.total || 0}`, sub: 'Modules', color: '#10B981' },
          { label: 'Sick Leave', value: leaves.sick_total - leaves.sick_used || 0, sub: 'Days remaining', color: '#F59E0B' },
          { label: 'Casual Leave', value: leaves.casual_total - leaves.casual_used || 0, sub: 'Days remaining', color: '#6366F1' },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-6 border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">{s.label}</p>
            <p className="text-3xl font-display font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-white/20 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Notifications */}
      {profile?.notifications?.length > 0 && (
        <div className="glass-panel border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Recent Notifications</h3>
          </div>
          <div className="divide-y divide-white/5">
            {profile.notifications.map((n, i) => (
              <div key={i} className="px-6 py-4 flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">{n.title}</p>
                  <p className="text-[10px] text-white/40 mt-1">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
